import { randomInt } from 'node:crypto';
import type {
  Client,
  MessageCreateOptions,
  TextBasedChannel,
} from 'discord.js';
import {
  arePollTournamentTablesPresent,
  attachPollTournamentAnnouncement,
  findRunningPollTournamentViews,
  getPollTournamentView,
  type PollTournamentView,
} from '../../data/queries/poll-tournament';
import {
  activatePollTournamentBracket,
  advancePollTournamentRound,
  claimPollTournamentFinalization,
  completePollTournament,
  completePollTournamentBracket,
  recoverStalePollTournamentClaims,
  releasePollTournamentFinalization,
} from '../../data/transactions/poll-tournament';
import { PollTournamentBracketStatus } from '../../generated/prisma/enums';
import { POLL_TOURNAMENT_CONFIG } from './poll-tournament.config';
import {
  buildPollTournamentAnnouncementMessages,
  buildPollTournamentBracketMessage,
  buildPollTournamentHostMessage,
} from './poll-tournament.discord';
import { buildStartedPollTournamentHostMessage } from './poll-tournament-host.discord';
import { buildExtendedPollTournamentResultsMessage } from './poll-tournament-results.discord';

const getPollChannel = async (client: Client, guildId: string) => {
  const channel = await client.channels
    .fetch(POLL_TOURNAMENT_CONFIG.channelId)
    .catch(() => null);

  if (
    !channel?.isTextBased() ||
    !('send' in channel) ||
    !('messages' in channel) ||
    !('guildId' in channel) ||
    channel.guildId !== guildId
  ) {
    throw new Error('The configured polls channel could not be found.');
  }

  return channel;
};

const sendChannelMessage = (
  channel: TextBasedChannel,
  options: MessageCreateOptions,
) => {
  if (!('send' in channel)) {
    throw new Error('The polls channel does not support messages.');
  }

  return channel.send(options);
};

export const refreshPollTournamentHostMessage = async (
  client: Client,
  tournamentId: string,
) => {
  const tournament = await getPollTournamentView(tournamentId);

  if (!tournament.hostMessageId) {
    return;
  }

  const channel = await client.channels
    .fetch(tournament.hostChannelId)
    .catch(() => null);

  if (!channel?.isTextBased() || !('messages' in channel)) {
    return;
  }

  const message = await channel.messages
    .fetch(tournament.hostMessageId)
    .catch(() => null);

  if (!message) {
    return;
  }

  const normalizedOptions = new Set(
    tournament.nominations.map(({ normalizedText }) => normalizedText),
  );
  const nominators = new Set(
    tournament.nominations.map(({ nominatorUserId }) => nominatorUserId),
  );

  const buildMessage =
    tournament.status === 'NOMINATING'
      ? buildPollTournamentHostMessage
      : buildStartedPollTournamentHostMessage;

  await message.edit(
    buildMessage({
      title: tournament.title,
      uniqueCount: normalizedOptions.size,
      nominatorCount: nominators.size,
      maxNominationsPerUser: tournament.maxNominationsPerUser,
    }),
  );
};

export const postPollTournamentAnnouncement = async (
  client: Client,
  tournament: PollTournamentView,
) => {
  const channel = await getPollChannel(client, tournament.guildId);
  const messages = buildPollTournamentAnnouncementMessages(tournament);
  let firstMessageId: string | null = null;

  for (const [index, options] of messages.entries()) {
    const message = await sendChannelMessage(channel, {
      ...options,
      nonce: `${tournament.id}:announcement:${index}`,
      enforceNonce: true,
    });
    firstMessageId ??= message.id;
  }

  if (!firstMessageId) {
    throw new Error('The poll tournament announcement was not posted.');
  }

  await attachPollTournamentAnnouncement({
    tournamentId: tournament.id,
    announcementMessageId: firstMessageId,
  });
  await refreshPollTournamentHostMessage(client, tournament.id);
};

const postNextDueBracket = async (
  client: Client,
  tournament: PollTournamentView,
  now: Date,
) => {
  const activeRound = tournament.rounds.find(
    ({ status }) => status === 'ACTIVE',
  );

  if (!activeRound) {
    return false;
  }

  const bracket = activeRound.brackets.find(
    ({ status, startsAt }) =>
      status === PollTournamentBracketStatus.PENDING &&
      startsAt !== null &&
      startsAt <= now,
  );

  if (!bracket) {
    return false;
  }

  const channel = await getPollChannel(client, tournament.guildId);
  const message = await sendChannelMessage(
    channel,
    buildPollTournamentBracketMessage({
      tournament,
      round: activeRound,
      bracket,
    }),
  );
  const endsAt = new Date(
    now.getTime() + POLL_TOURNAMENT_CONFIG.pollDurationHours * 60 * 60 * 1_000,
  );

  await activatePollTournamentBracket({
    bracketId: bracket.id,
    messageId: message.id,
    startedAt: now,
    endsAt,
    bracketStartIntervalMs:
      POLL_TOURNAMENT_CONFIG.bracketStartIntervalHours * 60 * 60 * 1_000,
  });

  return true;
};

const completeEndedBrackets = async (
  client: Client,
  tournament: PollTournamentView,
  now: Date,
) => {
  const channel = await getPollChannel(client, tournament.guildId);
  const endedBrackets = tournament.rounds.flatMap((round) =>
    round.brackets.filter(
      ({ status, endsAt, messageId }) =>
        status === PollTournamentBracketStatus.ACTIVE &&
        endsAt !== null &&
        endsAt <= now &&
        messageId !== null,
    ),
  );

  for (const bracket of endedBrackets) {
    const message = await channel.messages
      .fetch(bracket.messageId ?? '')
      .catch(() => null);
    const poll = message?.poll;

    if (!poll) {
      throw new Error(`Poll message ${bracket.messageId} could not be read.`);
    }

    const refreshedPoll = await poll.fetch();

    if (!refreshedPoll.resultsFinalized) {
      continue;
    }

    const answers = [...refreshedPoll.answers.values()];
    const results = bracket.entries.map((entry, index) => {
      const answer = answers[index];

      if (!answer) {
        throw new Error(`Poll result ${index + 1} is missing.`);
      }

      return { entryId: entry.id, voteCount: answer.voteCount };
    });

    await completePollTournamentBracket({ bracketId: bracket.id, results });
  }
};

const getBracketWinnerOptionId = (
  bracket: PollTournamentView['rounds'][number]['brackets'][number],
) => {
  const ranked = [...bracket.entries].sort((left, right) => {
    const voteDifference = (right.voteCount ?? 0) - (left.voteCount ?? 0);

    return (
      voteDifference || left.option.tieBreakOrder - right.option.tieBreakOrder
    );
  });
  const winner = ranked[0];

  if (!winner) {
    throw new Error(`Bracket ${bracket.id} has no winner.`);
  }

  return winner.optionId;
};

const shuffleWinnerIds = (winnerOptionIds: string[]) => {
  const shuffled = [...winnerOptionIds];

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

const advanceCompletedRound = async (
  tournament: PollTournamentView,
  now: Date,
) => {
  const activeRound = tournament.rounds.find(
    ({ status }) => status === 'ACTIVE',
  );

  if (
    !activeRound ||
    activeRound.kind === 'FINAL' ||
    activeRound.brackets.some(({ status }) => status !== 'COMPLETE')
  ) {
    return false;
  }

  return advancePollTournamentRound({
    currentRoundId: activeRound.id,
    winnerOptionIds: shuffleWinnerIds(
      activeRound.brackets.map(getBracketWinnerOptionId),
    ),
    nextStartsAt: now,
    bracketStartIntervalMs:
      POLL_TOURNAMENT_CONFIG.bracketStartIntervalHours * 60 * 60 * 1_000,
    pollDurationMs: POLL_TOURNAMENT_CONFIG.pollDurationHours * 60 * 60 * 1_000,
  });
};

const postCompletedTournamentResults = async (
  client: Client,
  tournament: PollTournamentView,
  now: Date,
) => {
  const finalRound = tournament.rounds.at(-1);
  const finalBracket = finalRound?.brackets[0];

  if (
    finalRound?.kind !== 'FINAL' ||
    finalBracket?.status !== PollTournamentBracketStatus.COMPLETE ||
    !finalBracket.messageId
  ) {
    return false;
  }

  const claimed = await claimPollTournamentFinalization(tournament.id);

  if (!claimed) {
    return false;
  }

  try {
    const channel = await getPollChannel(client, tournament.guildId);
    const finalists = finalBracket.entries.map((entry) => ({
      optionId: entry.optionId,
      finalVotes: entry.voteCount ?? 0,
      totalVotes: entry.option.totalVotes,
      tieBreakOrder: entry.option.tieBreakOrder,
    }));
    const finalistOptionIds = new Set(
      finalists.map(({ optionId }) => optionId),
    );
    const penultimateEntries = tournament.rounds
      .at(-2)
      ?.brackets.flatMap(({ entries }) => entries);
    const semifinalists =
      finalists.length === 2 && penultimateEntries?.length === 6
        ? penultimateEntries
            .filter(({ optionId }) => !finalistOptionIds.has(optionId))
            .map((entry) => ({
              optionId: entry.optionId,
              semifinalVotes: entry.voteCount ?? 0,
              totalVotes: entry.option.totalVotes,
            }))
        : [];

    await sendChannelMessage(channel, {
      ...buildExtendedPollTournamentResultsMessage({
        tournament,
        finalists,
        semifinalists,
      }),
      nonce: `${tournament.id}:results`,
      enforceNonce: true,
      reply: {
        messageReference: finalBracket.messageId,
        failIfNotExists: false,
      },
    });
    await completePollTournament({
      tournamentId: tournament.id,
      completedAt: now,
    });
    return true;
  } catch (error) {
    await releasePollTournamentFinalization(tournament.id);
    throw error;
  }
};

const runTournamentTick = async (
  client: Client,
  tournament: PollTournamentView,
  now: Date,
) => {
  if (!tournament.announcementMessageId) {
    await postPollTournamentAnnouncement(client, tournament);
    tournament = await getPollTournamentView(tournament.id);
  }
  await completeEndedBrackets(client, tournament, now);
  let current = await getPollTournamentView(tournament.id);

  if (await postCompletedTournamentResults(client, current, now)) {
    return;
  }

  if (await advanceCompletedRound(current, now)) {
    current = await getPollTournamentView(tournament.id);
  }

  await postNextDueBracket(client, current, now);
};

export const runPollTournamentNow = async (
  client: Client,
  tournamentId: string,
  now = new Date(),
) => runTournamentTick(client, await getPollTournamentView(tournamentId), now);

export const runPollTournamentLifecycleTick = async (
  client: Client,
  now = new Date(),
) => {
  if (!(await arePollTournamentTablesPresent())) {
    console.info('Poll tournament lifecycle skipped: schema is not ready.');
    return;
  }

  await recoverStalePollTournamentClaims(
    new Date(now.getTime() - 5 * 60 * 1_000),
  );

  const tournaments = await findRunningPollTournamentViews();

  for (const tournament of tournaments) {
    try {
      await runTournamentTick(client, tournament, now);
    } catch (error) {
      console.error(
        `Poll tournament lifecycle failed for ${tournament.id}`,
        error,
      );
    }
  }
};
