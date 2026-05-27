import {
  createCommandErrorLog as createCommandErrorLogRow,
  createCommandExecutionLog as createCommandExecutionLogRow,
} from '@data/queries/command-logging';
import type { ChatInputCommandInteraction, User } from 'discord.js';
import {
  type CommandExecutionStatus,
  Prisma,
} from '../../generated/prisma/client';

type CommandExecutionLogInteraction = {
  guildId: string | null;
  channelId: string | null;
  user: Pick<User, 'id' | 'tag'>;
};

const serializeOptions = (interaction: ChatInputCommandInteraction) => {
  try {
    const options = interaction.options.data.map((option) => ({
      name: option.name,
      type: option.type,
      value: 'value' in option ? (option.value ?? null) : null,
    }));

    return options;
  } catch {
    return Prisma.JsonNull;
  }
};

const serializeRawError = (rawError: unknown) => {
  if (rawError === null || rawError === undefined) {
    return Prisma.JsonNull;
  }

  if (typeof rawError === 'object') {
    return rawError as Prisma.InputJsonValue;
  }

  return {
    value: String(rawError),
  } satisfies Prisma.InputJsonValue;
};

export const createCommandExecutionLog = async ({
  interaction,
  commandName,
  status,
  note,
  durationMs,
}: {
  interaction: ChatInputCommandInteraction;
  commandName: string;
  status: CommandExecutionStatus;
  note?: string | null;
  durationMs?: number | null;
}) => {
  return createCommandExecutionLogRow({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    username: interaction.user.tag,
    commandName,
    optionsJson: serializeOptions(interaction),
    status,
    note: note ?? null,
    durationMs: durationMs ?? null,
  });
};

export const createInteractionExecutionLog = async ({
  interaction,
  commandName,
  optionsJson,
  status,
  note,
  durationMs,
}: {
  interaction: CommandExecutionLogInteraction;
  commandName: string;
  optionsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  status: CommandExecutionStatus;
  note?: string | null;
  durationMs?: number | null;
}) => {
  return createCommandExecutionLogRow({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    username: interaction.user.tag,
    commandName,
    optionsJson,
    status,
    note: note ?? null,
    durationMs: durationMs ?? null,
  });
};

export const createCommandErrorLog = async ({
  commandExecutionId,
  error,
}: {
  commandExecutionId: string;
  error: unknown;
}) => {
  const errorObject = error instanceof Error ? error : new Error(String(error));
  const anyError = error as {
    code?: number;
    status?: number;
    rawError?: unknown;
  };

  return createCommandErrorLogRow({
    commandExecutionId,
    errorName: errorObject.name,
    errorMessage: errorObject.message,
    stack: errorObject.stack ?? null,
    discordCode: typeof anyError?.code === 'number' ? anyError.code : null,
    httpStatus: typeof anyError?.status === 'number' ? anyError.status : null,
    rawJson: serializeRawError(anyError?.rawError),
  });
};
