import type { Prisma } from '../../generated/prisma/client';
import { PollTournamentStatus } from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import type {
  CreatePollTournamentInput,
  FindAccessiblePollTournamentsInput,
} from './poll-tournament.types';

const pollTournamentViewInclude = {
  nominations: {
    where: { removedAt: null },
    orderBy: { createdAt: 'asc' },
  },
  options: { orderBy: { seedOrder: 'asc' } },
  rounds: {
    orderBy: { roundNumber: 'asc' },
    include: {
      brackets: {
        orderBy: { bracketNumber: 'asc' },
        include: {
          entries: {
            orderBy: { position: 'asc' },
            include: { option: true },
          },
        },
      },
    },
  },
} as const;

export const arePollTournamentTablesPresent = async () => {
  const tables = await prisma.$queryRaw<{ objectName: string | null }[]>`
    select to_regclass('public."PollTournament"')::text as "objectName"
    union all
    select to_regclass('public."PollTournamentNomination"')::text as "objectName"
    union all
    select to_regclass('public."PollTournamentOption"')::text as "objectName"
    union all
    select to_regclass('public."PollTournamentRound"')::text as "objectName"
    union all
    select to_regclass('public."PollTournamentBracket"')::text as "objectName"
    union all
    select to_regclass('public."PollTournamentEntry"')::text as "objectName"
  `;

  return tables.length === 6 && tables.every(({ objectName }) => objectName);
};

export const createPollTournament = (input: CreatePollTournamentInput) =>
  prisma.pollTournament.create({ data: input });

export const attachPollTournamentHostMessage = ({
  tournamentId,
  hostMessageId,
}: {
  tournamentId: string;
  hostMessageId: string;
}) =>
  prisma.pollTournament.update({
    where: { id: tournamentId },
    data: { hostMessageId },
  });

export const attachPollTournamentAnnouncement = ({
  tournamentId,
  announcementMessageId,
}: {
  tournamentId: string;
  announcementMessageId: string;
}) =>
  prisma.pollTournament.update({
    where: { id: tournamentId },
    data: { announcementMessageId },
  });

export const getPollTournamentView = (tournamentId: string) =>
  prisma.pollTournament.findUniqueOrThrow({
    where: { id: tournamentId },
    include: pollTournamentViewInclude,
  });

export const findPollTournamentStartCandidate = (tournamentId: string) =>
  prisma.pollTournament.findUnique({
    where: { id: tournamentId },
    include: {
      nominations: {
        where: { removedAt: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

export const findNominatingPollTournamentsForGuild = (guildId: string) =>
  prisma.pollTournament.findMany({
    where: { guildId, status: PollTournamentStatus.NOMINATING },
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, hostUserId: true },
  });

export const findAccessibleActivePollTournaments = ({
  userId,
  canAccessAll,
}: FindAccessiblePollTournamentsInput) => {
  const where: Prisma.PollTournamentWhereInput = {
    status: {
      in: [
        PollTournamentStatus.NOMINATING,
        PollTournamentStatus.STARTING,
        PollTournamentStatus.RUNNING,
        PollTournamentStatus.FINALIZING,
      ],
    },
  };

  if (!canAccessAll) {
    where.hostUserId = userId;
  }

  return prisma.pollTournament.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: pollTournamentViewInclude,
  });
};

export const findManageablePollTournaments = ({
  userId,
  canAccessAll,
}: FindAccessiblePollTournamentsInput) => {
  const where: Prisma.PollTournamentWhereInput = {
    status: PollTournamentStatus.NOMINATING,
  };

  if (!canAccessAll) {
    where.hostUserId = userId;
  }

  return prisma.pollTournament.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      nominations: {
        where: { removedAt: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

export const findRunningPollTournamentViews = () =>
  prisma.pollTournament.findMany({
    where: {
      status: {
        in: [PollTournamentStatus.RUNNING, PollTournamentStatus.FINALIZING],
      },
    },
    orderBy: { startedAt: 'asc' },
    include: pollTournamentViewInclude,
  });

export type PollTournamentView = Awaited<
  ReturnType<typeof getPollTournamentView>
>;
