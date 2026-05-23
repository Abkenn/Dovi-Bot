import type {
  CommandExecutionStatus,
  Prisma,
} from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

type NullableJsonInput = Prisma.InputJsonValue | typeof Prisma.JsonNull;

export const createCommandExecutionLog = ({
  guildId,
  channelId,
  userId,
  username,
  commandName,
  optionsJson,
  status,
  note,
  durationMs,
}: {
  guildId: string | null;
  channelId: string | null;
  userId: string;
  username: string | null;
  commandName: string;
  optionsJson: NullableJsonInput;
  status: CommandExecutionStatus;
  note: string | null;
  durationMs: number | null;
}) =>
  prisma.commandExecutionLog.create({
    data: {
      guildId,
      channelId,
      userId,
      username,
      commandName,
      optionsJson,
      status,
      note,
      durationMs,
    },
  });

export const createCommandErrorLog = ({
  commandExecutionId,
  errorName,
  errorMessage,
  stack,
  discordCode,
  httpStatus,
  rawJson,
}: {
  commandExecutionId: string;
  errorName: string | null;
  errorMessage: string | null;
  stack: string | null;
  discordCode: number | null;
  httpStatus: number | null;
  rawJson: NullableJsonInput;
}) =>
  prisma.commandErrorLog.create({
    data: {
      commandExecutionId,
      errorName,
      errorMessage,
      stack,
      discordCode,
      httpStatus,
      rawJson,
    },
  });
