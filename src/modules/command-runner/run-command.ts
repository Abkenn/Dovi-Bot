import {
  type ChatInputCommandInteraction,
  type MessageEditOptions,
  MessageFlags,
} from 'discord.js';
import { ZodError } from 'zod';
import { BOT_GUILDS } from '../../config/discord-access';
import {
  type CommandHelpCategory,
  getCommandCategoryAccentColor,
} from '../../config/discord-command-categories';
import { HELP_COMMANDS } from '../../config/discord-command-metadata';
import { CommandExecutionStatus } from '../../generated/prisma/enums';
import { CommandDeniedError } from '../command-logging/command-denied';
import {
  createCommandErrorLog,
  createCommandExecutionLog,
} from '../command-logging/command-logging.service';
import {
  COMMAND_TIMEOUT_MESSAGE,
  COMMAND_TIMEOUT_MS,
  CommandTimeoutError,
} from '../command-logging/command-timeout';
import { buildComponentEmbedMessageFromEmbeds } from '../discord/component-embed';

const getUserFacingErrorMessage = (error: unknown): string => {
  if (error instanceof CommandDeniedError) {
    return error.message;
  }

  if (error instanceof CommandTimeoutError) {
    return error.message || COMMAND_TIMEOUT_MESSAGE;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return firstIssue?.message ?? 'Invalid command input.';
  }

  return 'Something went wrong while running the command.';
};

const getLogStatus = (error: unknown): CommandExecutionStatus => {
  if (error instanceof CommandDeniedError) {
    return CommandExecutionStatus.DENIED;
  }

  if (error instanceof CommandTimeoutError) {
    return CommandExecutionStatus.TIMEOUT;
  }

  return CommandExecutionStatus.ERROR;
};

const isUnknownInteractionError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 10062;

const shouldCreateErrorLog = (error: unknown): boolean => {
  if (error instanceof CommandDeniedError) {
    return false;
  }

  if (isUnknownInteractionError(error)) {
    return false;
  }

  return true;
};

const logCommandExecutionSafely = async (
  input: Parameters<typeof createCommandExecutionLog>[0],
) => {
  try {
    return await createCommandExecutionLog(input);
  } catch (error) {
    console.error('Failed to log command execution', error);
    return null;
  }
};

const logCommandErrorSafely = async ({
  interaction,
  commandName,
  status,
  durationMs,
  note,
  error,
  skipErrorLog,
}: Parameters<typeof createCommandExecutionLog>[0] & {
  error: unknown;
  skipErrorLog?: boolean;
}) => {
  const execution = await logCommandExecutionSafely({
    interaction,
    commandName,
    status,
    durationMs: durationMs ?? null,
    note: note ?? null,
  });

  if (!execution || skipErrorLog) {
    return;
  }

  try {
    await createCommandErrorLog({
      commandExecutionId: execution.id,
      error,
    });
  } catch (logError) {
    console.error('Failed to log command error', logError);
  }
};

const replyOrEditCommandError = async (
  interaction: ChatInputCommandInteraction,
  message: string,
) => {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply({
        content: message,
        embeds: [],
      });
    }

    return await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  } catch {
    return;
  }
};

export type CommandEditReplyOptions = MessageEditOptions & {
  componentMessage?: MessageEditOptions;
};

type CommandDeferReplyOptions = Parameters<
  ChatInputCommandInteraction['deferReply']
>[0];

type CommandEditReplyResult = Awaited<
  ReturnType<ChatInputCommandInteraction['editReply']>
>;

export type CommandRunContext = {
  /**
   * Pass this to command-facing services that may do DB or network work.
   * It prevents follow-up command work after timeout, but does not cancel
   * an already in-flight Prisma/Discord request.
   */
  signal: AbortSignal;
  hasTimedOut: () => boolean;
  editReply: (
    options: CommandEditReplyOptions,
  ) => Promise<CommandEditReplyResult | undefined>;
};

const getCommandCategory = (commandName: string): CommandHelpCategory | null =>
  HELP_COMMANDS.find((command) => command.name === commandName)?.helpCategory ??
  null;

const normalizeEditReplyOptions = (
  options: CommandEditReplyOptions,
  context: {
    commandName: string;
  },
): MessageEditOptions => {
  if (options.componentMessage) {
    const { componentMessage, ...replyOptions } = options;

    return {
      ...replyOptions,
      ...componentMessage,
    };
  }

  const { embeds } = options;

  if (!embeds) {
    return options;
  }

  const {
    embeds: _embeds,
    content: _content,
    components: existingComponents,
    ...replyOptions
  } = options;
  const category = getCommandCategory(context.commandName);
  const componentEmbedOptions = buildComponentEmbedMessageFromEmbeds(
    embeds,
    category ? { accentColor: getCommandCategoryAccentColor(category) } : {},
  );

  const normalizedOptions: MessageEditOptions = {
    ...replyOptions,
    allowedMentions: replyOptions.allowedMentions ?? { parse: [] },
    flags: MessageFlags.IsComponentsV2,
  };

  if (componentEmbedOptions.components) {
    normalizedOptions.components = [
      ...componentEmbedOptions.components,
      ...(existingComponents ?? []),
    ];
  }

  return normalizedOptions;
};

type Awaitable<T> = T | Promise<T>;
type CommandRun<T, TPreflight> = (
  context: CommandRunContext & { preflight: TPreflight },
) => Promise<T>;
type CommandRunByEnvironment<T, TPreflight> = {
  staging: CommandRun<T, TPreflight>;
  prod: CommandRun<T, TPreflight>;
};
type CommandRunOption<T, TPreflight> =
  | CommandRun<T, TPreflight>
  | CommandRunByEnvironment<T, TPreflight>;

const isCommandRun = <T, TPreflight>(
  run: CommandRunOption<T, TPreflight>,
): run is CommandRun<T, TPreflight> => typeof run === 'function';

const getCommandRunForInteraction = <T, TPreflight>({
  interaction,
  run,
}: {
  interaction: ChatInputCommandInteraction;
  run: CommandRunOption<T, TPreflight>;
}): CommandRun<T, TPreflight> => {
  if (isCommandRun(run)) {
    return run;
  }

  return interaction.guildId === BOT_GUILDS.STAGING_ENV
    ? run.staging
    : run.prod;
};

type RunCommandOptions<T, TPreflight = void> = {
  interaction: ChatInputCommandInteraction;
  commandName: string;
  deferReplyOptions?: CommandDeferReplyOptions;
  timeoutMs?: number | null;
  timeoutMessage?: string;
  withCommandLogging?: boolean;
  /**
   * Runs before deferReply, so keep this to fast local checks only.
   * Do not put DB or network calls here.
   */
  beforeDefer?: () => Awaitable<TPreflight>;
  run: CommandRunOption<T, TPreflight>;
};

export const EPHEMERAL_COMMAND_REPLY = {
  flags: MessageFlags.Ephemeral,
} as const satisfies CommandDeferReplyOptions;

export const runCommand = async <T, TPreflight = void>({
  interaction,
  commandName,
  deferReplyOptions,
  timeoutMs = COMMAND_TIMEOUT_MS,
  timeoutMessage,
  withCommandLogging = true,
  beforeDefer,
  run,
}: RunCommandOptions<T, TPreflight>) => {
  const startedAt = Date.now();
  const abortController = new AbortController();
  let timeoutId: NodeJS.Timeout | undefined;
  let hasSentCommandResponse = false;

  try {
    const preflight = beforeDefer
      ? await beforeDefer()
      : (undefined as TPreflight);

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply(deferReplyOptions);
    }

    const runCommandImplementation = getCommandRunForInteraction({
      interaction,
      run,
    });
    const runPromise = runCommandImplementation({
      preflight,
      signal: abortController.signal,
      hasTimedOut: () => abortController.signal.aborted,
      editReply: async (options) => {
        if (abortController.signal.aborted) {
          return;
        }

        const response = await interaction.editReply(
          normalizeEditReplyOptions(options, {
            commandName,
          }),
        );
        hasSentCommandResponse = true;

        return response;
      },
    });

    const result =
      timeoutMs === null
        ? await runPromise
        : await Promise.race([
            runPromise,
            new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                abortController.abort();
                reject(new CommandTimeoutError(timeoutMessage));
              }, timeoutMs);
            }),
          ]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    if (withCommandLogging) {
      await logCommandExecutionSafely({
        interaction,
        commandName,
        status: CommandExecutionStatus.SUCCESS,
        durationMs: Date.now() - startedAt,
        note: hasSentCommandResponse
          ? null
          : 'Command completed without sending a response',
      });
    }

    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const message = getUserFacingErrorMessage(error);
    const note =
      error instanceof Error ? error.message : 'Unknown command error';

    const isUnknownInteraction = isUnknownInteractionError(error);
    const shouldSendResponse = !hasSentCommandResponse && !isUnknownInteraction;
    const response = shouldSendResponse
      ? await replyOrEditCommandError(interaction, message)
      : undefined;

    if (withCommandLogging) {
      await logCommandErrorSafely({
        interaction,
        commandName,
        status: getLogStatus(error),
        durationMs: Date.now() - startedAt,
        note,
        error,
        skipErrorLog: !shouldCreateErrorLog(error),
      });
    }

    return response;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};
