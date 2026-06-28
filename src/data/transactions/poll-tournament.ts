import type { Prisma } from '../../generated/prisma/client';
import {
  PollTournamentBracketStatus,
  PollTournamentRoundStatus,
  PollTournamentStatus,
} from '../../generated/prisma/enums';
import { prisma } from '../../lib/prisma';
import type {
  ActivatePollTournamentBracketInput,
  AdvancePollTournamentRoundInput,
  CompletePollTournamentBracketInput,
  FinalizePollTournamentStartInput,
  NominatePollTournamentInput,
  RemovePollTournamentNominationInput,
} from './poll-tournament.types';

const lockPollTournamentNominations = (
  transaction: Prisma.TransactionClient,
  tournamentId: string,
) =>
  transaction.$queryRaw`
    select pg_advisory_xact_lock(hashtextextended(${tournamentId}, 0))::text
  `;

export const nominatePollTournamentOptions = async ({
  tournamentId,
  guildId,
  nominatorUserId,
  nominations,
}: NominatePollTournamentInput) =>
  prisma.$transaction(async (transaction) => {
    await lockPollTournamentNominations(transaction, tournamentId);

    const tournament = await transaction.pollTournament.findFirst({
      where: {
        id: tournamentId,
        guildId,
        status: PollTournamentStatus.NOMINATING,
      },
      select: { id: true, maxNominationsPerUser: true },
    });

    if (!tournament) {
      return { outcome: 'NOT_OPEN' } as const;
    }

    const existing = await transaction.pollTournamentNomination.findMany({
      where: { tournamentId, nominatorUserId, removedAt: null },
      select: { normalizedText: true },
    });
    const requestedByNormalizedText = new Map(
      nominations.map((nomination) => [nomination.normalizedText, nomination]),
    );
    const usedNormalizedTexts = new Set([
      ...existing.map(({ normalizedText }) => normalizedText),
      ...requestedByNormalizedText.keys(),
    ]);

    if (usedNormalizedTexts.size > tournament.maxNominationsPerUser) {
      return {
        outcome: 'LIMIT_REACHED',
        usedCount: existing.length,
        maxNominationsPerUser: tournament.maxNominationsPerUser,
      } as const;
    }

    for (const nomination of requestedByNormalizedText.values()) {
      await transaction.pollTournamentNomination.upsert({
        where: {
          tournamentId_nominatorUserId_normalizedText: {
            tournamentId,
            nominatorUserId,
            normalizedText: nomination.normalizedText,
          },
        },
        update: {
          text: nomination.text,
          removedAt: null,
          removedByUserId: null,
        },
        create: {
          tournamentId,
          nominatorUserId,
          text: nomination.text,
          normalizedText: nomination.normalizedText,
        },
      });
    }

    const activeNominations =
      await transaction.pollTournamentNomination.findMany({
        where: { tournamentId, removedAt: null },
        select: { nominatorUserId: true, normalizedText: true },
      });

    return {
      outcome: 'SAVED',
      usedCount: usedNormalizedTexts.size,
      maxNominationsPerUser: tournament.maxNominationsPerUser,
      uniqueCount: new Set(
        activeNominations.map(({ normalizedText }) => normalizedText),
      ).size,
      nominatorCount: new Set(
        activeNominations.map(({ nominatorUserId: userId }) => userId),
      ).size,
    } as const;
  });

export const claimPollTournamentStart = async ({
  tournamentId,
  hostUserId,
}: {
  tournamentId: string;
  hostUserId: string;
}) => {
  const result = await prisma.$transaction(async (transaction) => {
    await lockPollTournamentNominations(transaction, tournamentId);

    return transaction.pollTournament.updateMany({
      where: {
        id: tournamentId,
        hostUserId,
        status: PollTournamentStatus.NOMINATING,
      },
      data: { status: PollTournamentStatus.STARTING },
    });
  });

  return result.count === 1;
};

export const removePollTournamentNominations = ({
  tournamentId,
  normalizedText,
  removedByUserId,
  removedAt,
}: RemovePollTournamentNominationInput) =>
  prisma.$transaction(async (transaction) => {
    await lockPollTournamentNominations(transaction, tournamentId);

    return transaction.pollTournamentNomination.updateMany({
      where: {
        tournamentId,
        normalizedText,
        removedAt: null,
        tournament: { status: PollTournamentStatus.NOMINATING },
      },
      data: { removedAt, removedByUserId },
    });
  });

export const releasePollTournamentStart = (tournamentId: string) =>
  prisma.pollTournament.updateMany({
    where: { id: tournamentId, status: PollTournamentStatus.STARTING },
    data: { status: PollTournamentStatus.NOMINATING },
  });

export const finalizePollTournamentStart = async ({
  tournamentId,
  plannedDurationDays,
  startedAt,
  bracketStartIntervalMs,
  pollDurationMs,
  options,
  rounds,
}: FinalizePollTournamentStartInput) =>
  prisma.$transaction(async (transaction) => {
    const tournament = await transaction.pollTournament.findFirstOrThrow({
      where: { id: tournamentId, status: PollTournamentStatus.STARTING },
      select: { id: true },
    });

    await transaction.pollTournamentOption.createMany({
      data: options.map((option) => ({ tournamentId, ...option })),
    });
    const createdOptions = await transaction.pollTournamentOption.findMany({
      where: { tournamentId },
      orderBy: { seedOrder: 'asc' },
    });

    for (const [roundIndex, round] of rounds.entries()) {
      const isFirstRound = roundIndex === 0;
      const createdRound = await transaction.pollTournamentRound.create({
        data: {
          tournamentId,
          roundNumber: roundIndex + 1,
          kind: round.kind,
          status: isFirstRound
            ? PollTournamentRoundStatus.ACTIVE
            : PollTournamentRoundStatus.PENDING,
          brackets: {
            create: round.bracketSizes.map((optionCount, bracketIndex) => {
              if (!isFirstRound) {
                return { bracketNumber: bracketIndex + 1, optionCount };
              }

              const startsAt = new Date(
                startedAt.getTime() + bracketIndex * bracketStartIntervalMs,
              );

              return {
                bracketNumber: bracketIndex + 1,
                optionCount,
                startsAt,
                endsAt: new Date(startsAt.getTime() + pollDurationMs),
              };
            }),
          },
        },
        include: { brackets: { orderBy: { bracketNumber: 'asc' } } },
      });

      if (!isFirstRound) {
        continue;
      }

      let optionOffset = 0;
      for (const bracket of createdRound.brackets) {
        const bracketOptions = createdOptions.slice(
          optionOffset,
          optionOffset + bracket.optionCount,
        );
        optionOffset += bracket.optionCount;

        await transaction.pollTournamentEntry.createMany({
          data: bracketOptions.map((option, position) => ({
            bracketId: bracket.id,
            optionId: option.id,
            position,
          })),
        });
      }
    }

    await transaction.pollTournament.update({
      where: { id: tournament.id },
      data: {
        status: PollTournamentStatus.RUNNING,
        plannedDurationDays,
        startedAt,
      },
    });

    return tournament.id;
  });

export const activatePollTournamentBracket = async ({
  bracketId,
  messageId,
  startedAt,
  endsAt,
  bracketStartIntervalMs,
}: ActivatePollTournamentBracketInput) =>
  prisma.$transaction(async (transaction) => {
    const bracket = await transaction.pollTournamentBracket.findUniqueOrThrow({
      where: { id: bracketId },
      select: { id: true, roundId: true, bracketNumber: true },
    });
    const pollDurationMs = endsAt.getTime() - startedAt.getTime();
    const laterBrackets = await transaction.pollTournamentBracket.findMany({
      where: {
        roundId: bracket.roundId,
        bracketNumber: { gt: bracket.bracketNumber },
        status: PollTournamentBracketStatus.PENDING,
      },
      orderBy: { bracketNumber: 'asc' },
    });

    await transaction.pollTournamentBracket.update({
      where: { id: bracket.id },
      data: {
        messageId,
        status: PollTournamentBracketStatus.ACTIVE,
        startsAt: startedAt,
        endsAt,
      },
    });

    for (const laterBracket of laterBrackets) {
      const startsAt = new Date(
        startedAt.getTime() +
          (laterBracket.bracketNumber - bracket.bracketNumber) *
            bracketStartIntervalMs,
      );
      await transaction.pollTournamentBracket.update({
        where: { id: laterBracket.id },
        data: {
          startsAt,
          endsAt: new Date(startsAt.getTime() + pollDurationMs),
        },
      });
    }
  });
export const completePollTournamentBracket = async ({
  bracketId,
  results,
}: CompletePollTournamentBracketInput) =>
  prisma.$transaction(async (transaction) => {
    const claim = await transaction.pollTournamentBracket.updateMany({
      where: {
        id: bracketId,
        status: PollTournamentBracketStatus.ACTIVE,
      },
      data: { status: PollTournamentBracketStatus.COMPLETE },
    });

    if (claim.count === 0) {
      return false;
    }

    for (const result of results) {
      const entry = await transaction.pollTournamentEntry.update({
        where: { id: result.entryId },
        data: { voteCount: result.voteCount },
        select: { optionId: true },
      });
      await transaction.pollTournamentOption.update({
        where: { id: entry.optionId },
        data: { totalVotes: { increment: result.voteCount } },
      });
    }

    return true;
  });

export const advancePollTournamentRound = async ({
  currentRoundId,
  winnerOptionIds,
  nextStartsAt,
  bracketStartIntervalMs,
  pollDurationMs,
}: AdvancePollTournamentRoundInput) =>
  prisma.$transaction(async (transaction) => {
    const currentRound =
      await transaction.pollTournamentRound.findUniqueOrThrow({
        where: { id: currentRoundId },
        include: { brackets: true },
      });
    const allBracketsComplete = currentRound.brackets.every(
      ({ status }) => status === PollTournamentBracketStatus.COMPLETE,
    );

    if (
      currentRound.status !== PollTournamentRoundStatus.ACTIVE ||
      !allBracketsComplete
    ) {
      return false;
    }

    const nextRound = await transaction.pollTournamentRound.findUniqueOrThrow({
      where: {
        tournamentId_roundNumber: {
          tournamentId: currentRound.tournamentId,
          roundNumber: currentRound.roundNumber + 1,
        },
      },
      include: { brackets: { orderBy: { bracketNumber: 'asc' } } },
    });

    if (nextRound.status !== PollTournamentRoundStatus.PENDING) {
      return false;
    }

    await transaction.pollTournamentRound.update({
      where: { id: currentRound.id },
      data: { status: PollTournamentRoundStatus.COMPLETE },
    });
    await transaction.pollTournamentRound.update({
      where: { id: nextRound.id },
      data: { status: PollTournamentRoundStatus.ACTIVE },
    });

    let optionOffset = 0;
    for (const [bracketIndex, bracket] of nextRound.brackets.entries()) {
      const startsAt = new Date(
        nextStartsAt.getTime() + bracketIndex * bracketStartIntervalMs,
      );
      await transaction.pollTournamentBracket.update({
        where: { id: bracket.id },
        data: {
          startsAt,
          endsAt: new Date(startsAt.getTime() + pollDurationMs),
        },
      });
      const bracketOptionIds = winnerOptionIds.slice(
        optionOffset,
        optionOffset + bracket.optionCount,
      );
      optionOffset += bracket.optionCount;
      await transaction.pollTournamentEntry.createMany({
        data: bracketOptionIds.map((optionId, position) => ({
          bracketId: bracket.id,
          optionId,
          position,
        })),
      });
    }

    return true;
  });

export const claimPollTournamentFinalization = async (tournamentId: string) => {
  const result = await prisma.pollTournament.updateMany({
    where: { id: tournamentId, status: PollTournamentStatus.RUNNING },
    data: { status: PollTournamentStatus.FINALIZING },
  });

  return result.count === 1;
};

export const releasePollTournamentFinalization = (tournamentId: string) =>
  prisma.pollTournament.updateMany({
    where: { id: tournamentId, status: PollTournamentStatus.FINALIZING },
    data: { status: PollTournamentStatus.RUNNING },
  });

export const completePollTournament = ({
  tournamentId,
  completedAt,
}: {
  tournamentId: string;
  completedAt: Date;
}) =>
  prisma.pollTournament.update({
    where: { id: tournamentId, status: PollTournamentStatus.FINALIZING },
    data: {
      status: PollTournamentStatus.COMPLETED,
      completedAt,
    },
  });

export const recoverStalePollTournamentClaims = (cutoff: Date) =>
  prisma.$transaction([
    prisma.pollTournament.updateMany({
      where: {
        status: PollTournamentStatus.STARTING,
        updatedAt: { lt: cutoff },
      },
      data: { status: PollTournamentStatus.NOMINATING },
    }),
    prisma.pollTournament.updateMany({
      where: {
        status: PollTournamentStatus.FINALIZING,
        updatedAt: { lt: cutoff },
      },
      data: { status: PollTournamentStatus.RUNNING },
    }),
  ]);
