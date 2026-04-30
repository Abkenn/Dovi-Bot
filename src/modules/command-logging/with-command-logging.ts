import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { ZodError } from 'zod';
import {
  createCommandErrorLog,
  createCommandExecutionLog,
} from './command-logging.service';
import {
  COMMAND_TIMEOUT_MESSAGE,
  CommandTimeoutError,
} from './command-timeout';

const getUserFacingErrorMessage = (error: unknown): string => {
  if (error instanceof CommandTimeoutError) {
    return COMMAND_TIMEOUT_MESSAGE;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return firstIssue?.message ?? 'Invalid command input.';
  }

  return 'Something went wrong while running the command.';
};

const getLogStatus = (error: unknown): 'ERROR' | 'TIMEOUT' => {
  if (error instanceof CommandTimeoutError) {
    return 'TIMEOUT';
  }

  return 'ERROR';
};

const isUnknownInteractionError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 10062;

export const withCommandLogging = async <T>({
  interaction,
  commandName,
  run,
}: {
  interaction: ChatInputCommandInteraction;
  commandName: string;
  run: () => Promise<T>;
}) => {
  const startedAt = Date.now();

  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const result = await run();

    await createCommandExecutionLog({
      interaction,
      commandName,
      status: 'SUCCESS',
      durationMs: Date.now() - startedAt,
      note: null,
    });

    return result;
  } catch (error) {
    const message = getUserFacingErrorMessage(error);
    const note =
      error instanceof Error ? error.message : 'Unknown command error';

    const isUnknownInteraction = isUnknownInteractionError(error);

    const execution = await createCommandExecutionLog({
      interaction,
      commandName,
      status: getLogStatus(error),
      durationMs: Date.now() - startedAt,
      note,
    });

    if (!isUnknownInteraction) {
      await createCommandErrorLog({
        commandExecutionId: execution.id,
        error,
      });
    }

    if (isUnknownInteraction) {
      return;
    }

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
  }
};
