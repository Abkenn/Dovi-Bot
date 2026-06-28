import { randomInt } from 'node:crypto';
import { env } from '@zod-schemas/env.zod';
import { z } from 'zod';
import {
  attachPollTournamentHostMessage,
  createPollTournament,
  findAccessibleActivePollTournaments,
  findManageablePollTournaments,
  findNominatingPollTournamentsForGuild,
  findPollTournamentStartCandidate,
  getPollTournamentView,
} from '../../data/queries/poll-tournament';
import {
  claimPollTournamentStart,
  finalizePollTournamentStart,
  nominatePollTournamentOptions,
  releasePollTournamentStart,
  removePollTournamentNominations,
} from '../../data/transactions/poll-tournament';
import { PollTournamentStatus } from '../../generated/prisma/enums';
import { CommandDeniedError } from '../command-logging/command-denied';
import { POLL_TOURNAMENT_CONFIG } from './poll-tournament.config';
import type {
  HostPollTournamentInput,
  ManagePollTournamentInput,
  NominatePollTournamentInput,
  PollTournamentStartResult,
  StartPollTournamentInput,
} from './poll-tournament.service.types';
import {
  buildPollTournamentPlan,
  cleanPollText,
  normalizePollOption,
} from './poll-tournament.utils';

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Give the poll a title.')
  .max(
    POLL_TOURNAMENT_CONFIG.maxTitleLength,
    `Poll titles must be ${POLL_TOURNAMENT_CONFIG.maxTitleLength} characters or fewer.`,
  );

const optionSchema = z
  .string()
  .trim()
  .min(1, 'Each nomination needs a name.')
  .max(
    POLL_TOURNAMENT_CONFIG.maxOptionLength,
    `Nominations must be ${POLL_TOURNAMENT_CONFIG.maxOptionLength} characters or fewer.`,
  );

const nominationLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(POLL_TOURNAMENT_CONFIG.maxNominationsPerUser);

const failValidation = (message: string): never =>
  z.custom<never>(() => false, { error: message }).parse(undefined);

const getPollTournamentPlan = (optionCount: number) => {
  try {
    return buildPollTournamentPlan(optionCount);
  } catch (error) {
    if (error instanceof Error) {
      return failValidation(error.message);
    }

    throw error;
  }
};

const shuffle = <T>(values: T[]): T[] => {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const current = shuffled[index];
    const replacement = shuffled[swapIndex];

    if (current === undefined || replacement === undefined) {
      continue;
    }

    shuffled[index] = replacement;
    shuffled[swapIndex] = current;
  }

  return shuffled;
};

export const hostPollTournament = (input: HostPollTournamentInput) =>
  createPollTournament({
    ...input,
    title: titleSchema.parse(cleanPollText(input.title)),
    maxNominationsPerUser: nominationLimitSchema.parse(
      input.maxNominationsPerUser,
    ),
  });

export const attachHostedPollTournamentMessage = ({
  tournamentId,
  hostMessageId,
}: {
  tournamentId: string;
  hostMessageId: string;
}) => attachPollTournamentHostMessage({ tournamentId, hostMessageId });

export const nominatePollTournament = async ({
  guildId,
  tournamentId,
  nominatorUserId,
  optionInputs,
}: NominatePollTournamentInput) => {
  const nominations = optionInputs
    .filter((value): value is string => value !== null)
    .map((value) => optionSchema.parse(cleanPollText(value)))
    .map((text) => ({ text, normalizedText: normalizePollOption(text) }));

  if (nominations.length === 0) {
    failValidation('Nominate at least one option.');
  }

  const result = await nominatePollTournamentOptions({
    tournamentId,
    guildId,
    nominatorUserId,
    nominations,
  });

  if (result.outcome === 'NOT_OPEN') {
    failValidation('That poll is no longer accepting nominations.');
  }

  if (result.outcome === 'LIMIT_REACHED') {
    failValidation(
      `You can nominate up to ${result.maxNominationsPerUser} options for this poll. You currently have ${result.usedCount}.`,
    );
  }

  return result;
};

export const getNominatingPollAutocomplete = async ({
  guildId,
  userId,
  onlyHosted,
  query,
}: {
  guildId: string;
  userId: string;
  onlyHosted: boolean;
  query: string;
}) => {
  const tournaments = await findNominatingPollTournamentsForGuild(guildId);
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');

  return tournaments
    .filter((tournament) => !onlyHosted || tournament.hostUserId === userId)
    .filter(
      ({ title }) =>
        !normalizedQuery ||
        title.toLocaleLowerCase('en-US').includes(normalizedQuery),
    )
    .slice(0, 25)
    .map(({ id, title }) => ({ name: title, value: id }));
};

const getUniqueStartOptions = (
  nominations: Array<{ text: string; normalizedText: string }>,
) => {
  const optionsByNormalizedText = new Map<string, string>();

  for (const nomination of nominations) {
    if (!optionsByNormalizedText.has(nomination.normalizedText)) {
      optionsByNormalizedText.set(nomination.normalizedText, nomination.text);
    }
  }

  return [...optionsByNormalizedText].map(([normalizedText, text]) => ({
    text,
    normalizedText,
  }));
};

export const startPollTournament = async ({
  tournamentId,
  hostUserId,
  now = new Date(),
}: StartPollTournamentInput): Promise<PollTournamentStartResult> => {
  const candidate = await findPollTournamentStartCandidate(tournamentId);

  if (!candidate) {
    return failValidation('That poll could not be found.');
  }

  if (candidate.hostUserId !== hostUserId) {
    throw new CommandDeniedError("You can't start a poll you did not host.");
  }

  if (candidate.status !== PollTournamentStatus.NOMINATING) {
    failValidation('That poll has already started.');
  }

  const claimed = await claimPollTournamentStart({
    tournamentId,
    hostUserId,
  });

  if (!claimed) {
    failValidation('That poll is already being started.');
  }

  try {
    const lockedCandidate =
      await findPollTournamentStartCandidate(tournamentId);

    if (!lockedCandidate) {
      return failValidation('That poll could not be found.');
    }

    const uniqueOptions = getUniqueStartOptions(lockedCandidate.nominations);
    const plan = getPollTournamentPlan(uniqueOptions.length);
    const seededOptions = shuffle(uniqueOptions);
    const tieBreakOptions = shuffle(uniqueOptions);
    const tieBreakOrderByNormalizedText = new Map(
      tieBreakOptions.map(({ normalizedText }, index) => [
        normalizedText,
        index,
      ]),
    );

    await finalizePollTournamentStart({
      tournamentId,
      plannedDurationDays: plan.durationDays,
      startedAt: now,
      bracketStartIntervalMs:
        POLL_TOURNAMENT_CONFIG.bracketStartIntervalHours * 60 * 60 * 1_000,
      pollDurationMs:
        POLL_TOURNAMENT_CONFIG.pollDurationHours * 60 * 60 * 1_000,
      options: seededOptions.map((option, seedOrder) => ({
        ...option,
        seedOrder,
        tieBreakOrder:
          tieBreakOrderByNormalizedText.get(option.normalizedText) ?? seedOrder,
      })),
      rounds: plan.rounds,
    });

    return {
      tournament: await getPollTournamentView(tournamentId),
    };
  } catch (error) {
    await releasePollTournamentStart(tournamentId);
    throw error;
  }
};

const canAccessAllPolls = (userId: string) =>
  Boolean(env.DAVI_DISCORD_USER_ID) && userId === env.DAVI_DISCORD_USER_ID;

export const getAccessiblePollTournaments = (userId: string) =>
  findAccessibleActivePollTournaments({
    userId,
    canAccessAll: canAccessAllPolls(userId),
  });

export const getManageablePollTournaments = (userId: string) =>
  findManageablePollTournaments({
    userId,
    canAccessAll: canAccessAllPolls(userId),
  });

export const getManageablePollAutocomplete = async ({
  userId,
  query,
}: {
  userId: string;
  query: string;
}) => {
  const tournaments = await getManageablePollTournaments(userId);
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');

  return tournaments
    .filter(
      ({ title }) =>
        !normalizedQuery ||
        title.toLocaleLowerCase('en-US').includes(normalizedQuery),
    )
    .slice(0, 25)
    .map(({ id, title }) => ({ name: title, value: id }));
};

export const getManageableOptionAutocomplete = async ({
  userId,
  tournamentId,
  query,
}: {
  userId: string;
  tournamentId: string | null;
  query: string;
}) => {
  if (!tournamentId) {
    return [];
  }

  const tournaments = await getManageablePollTournaments(userId);
  const tournament = tournaments.find(({ id }) => id === tournamentId);

  if (!tournament) {
    return [];
  }

  const normalizedQuery = normalizePollOption(query);
  const optionsByNormalizedText = new Map<string, string>();

  for (const nomination of tournament.nominations) {
    if (!optionsByNormalizedText.has(nomination.normalizedText)) {
      optionsByNormalizedText.set(nomination.normalizedText, nomination.text);
    }
  }

  return [...optionsByNormalizedText]
    .filter(
      ([normalizedText]) =>
        !normalizedQuery || normalizedText.includes(normalizedQuery),
    )
    .slice(0, 25)
    .map(([value, name]) => ({ name, value }));
};

export const managePollTournament = async ({
  tournamentId,
  normalizedOption,
  userId,
}: ManagePollTournamentInput) => {
  const normalizedRequestedOption = normalizePollOption(normalizedOption);
  const tournaments = await getManageablePollTournaments(userId);
  const tournament = tournaments.find(({ id }) => id === tournamentId);

  if (!tournament) {
    throw new CommandDeniedError(
      "You can't manage that poll, or it is no longer accepting nominations.",
    );
  }

  const nomination = tournament.nominations.find(
    ({ normalizedText }) => normalizedText === normalizedRequestedOption,
  );

  if (!nomination) {
    return failValidation('That option is no longer in the nomination list.');
  }

  const removed = await removePollTournamentNominations({
    tournamentId,
    normalizedText: nomination.normalizedText,
    removedByUserId: userId,
    removedAt: new Date(),
  });

  if (removed.count === 0) {
    return failValidation(
      'That poll is no longer accepting nomination changes.',
    );
  }

  return {
    removedOption: nomination.text,
    tournament: await getPollTournamentView(tournamentId),
  };
};
