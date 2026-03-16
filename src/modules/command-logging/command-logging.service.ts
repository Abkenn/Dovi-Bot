import type { ChatInputCommandInteraction } from 'discord.js';
import {
  type CommandExecutionStatus,
  Prisma,
} from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

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
  return prisma.commandExecutionLog.create({
    data: {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
      username: interaction.user.tag,
      commandName,
      optionsJson: serializeOptions(interaction),
      status,
      note: note ?? null,
      durationMs: durationMs ?? null,
    },
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

  return prisma.commandErrorLog.create({
    data: {
      commandExecutionId,
      errorName: errorObject.name,
      errorMessage: errorObject.message,
      stack: errorObject.stack ?? null,
      discordCode: typeof anyError?.code === 'number' ? anyError.code : null,
      httpStatus: typeof anyError?.status === 'number' ? anyError.status : null,
      rawJson: serializeRawError(anyError?.rawError),
    },
  });
};

export const getRecentCommandExecutions = async (take = 100) => {
  return prisma.commandExecutionLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });
};

export const getRecentCommandErrors = async (take = 10) => {
  return prisma.commandErrorLog.findMany({
    include: {
      commandExecution: true,
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
};
