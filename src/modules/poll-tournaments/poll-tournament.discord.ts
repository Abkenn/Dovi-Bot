import type { MessageCreateOptions, MessageEditOptions } from 'discord.js';
import type { PollTournamentView } from '../../data/queries/poll-tournament';
import { POLL_TOURNAMENT_CONFIG } from './poll-tournament.config';
import type { PollFinalistResult } from './poll-tournament.types';
import { rankFinalists } from './poll-tournament.utils';

export const buildPollTournamentHostMessage = ({
  title,
  uniqueCount,
  nominatorCount,
  maxNominationsPerUser,
}: {
  title: string;
  uniqueCount: number;
  nominatorCount: number;
  maxNominationsPerUser: number;
}): MessageEditOptions => ({
  content: [
    `**${title}**`,
    `Nominations are open. Use \`/poll-nominate\` to nominate up to ${maxNominationsPerUser} options privately.`,
    `Unique nominations: **${uniqueCount}**`,
    `Nominators: **${nominatorCount}**`,
  ].join('\n'),
  allowedMentions: { parse: [] },
});

const getRoundPlanLabel = (
  round: PollTournamentView['rounds'][number],
): string => {
  const bracketCount = round.brackets.length;

  if (round.kind === 'FINAL') {
    return '1 final';
  }

  if (round.kind === 'QUALIFICATION') {
    return `${bracketCount} qualification brackets`;
  }

  return `${bracketCount} elimination brackets`;
};

const appendLineToChunks = (chunks: string[], line: string) => {
  const lastIndex = chunks.length - 1;
  const lastChunk = chunks[lastIndex] ?? '';
  const candidate = lastChunk ? `${lastChunk}\n${line}` : line;

  if (candidate.length <= 1_900) {
    chunks[lastIndex] = candidate;
    return;
  }

  chunks.push(line);
};

export const buildPollTournamentAnnouncementMessages = (
  tournament: PollTournamentView,
): MessageCreateOptions[] => {
  const plan = tournament.rounds.map(getRoundPlanLabel).join(', ');
  const chunks = [
    [
      `<@&${POLL_TOURNAMENT_CONFIG.pingRoleId}> **${tournament.title}** is starting!`,
      `Tournament plan: ${plan}.`,
      `Voting lasts ${POLL_TOURNAMENT_CONFIG.pollDurationHours / 24} days per bracket, with one new bracket each day.`,
      '',
      '**Nominated options**',
    ].join('\n'),
  ];

  for (const [index, option] of tournament.options.entries()) {
    appendLineToChunks(chunks, `${index + 1}. ${option.text}`);
  }

  return chunks.map((content, index) => ({
    content,
    allowedMentions:
      index === 0
        ? { parse: [], roles: [POLL_TOURNAMENT_CONFIG.pingRoleId] }
        : { parse: [] },
  }));
};

const getBracketQuestion = (
  tournament: PollTournamentView,
  round: PollTournamentView['rounds'][number],
  bracket: PollTournamentView['rounds'][number]['brackets'][number],
) => {
  if (round.kind === 'FINAL') {
    return `${tournament.title} | Final`;
  }

  const roundLabel =
    round.kind === 'QUALIFICATION'
      ? 'Qualification'
      : `Round ${round.roundNumber}`;

  return `${tournament.title} | ${roundLabel} ${bracket.bracketNumber}/${round.brackets.length}`;
};

export const buildPollTournamentBracketMessage = ({
  tournament,
  round,
  bracket,
}: {
  tournament: PollTournamentView;
  round: PollTournamentView['rounds'][number];
  bracket: PollTournamentView['rounds'][number]['brackets'][number];
}): MessageCreateOptions => ({
  poll: {
    question: { text: getBracketQuestion(tournament, round, bracket) },
    answers: bracket.entries.map(({ option }) => ({ text: option.text })),
    duration: POLL_TOURNAMENT_CONFIG.pollDurationHours,
    allowMultiselect: false,
  },
  nonce: bracket.id,
  enforceNonce: true,
  allowedMentions: { parse: [] },
});

const getPlacementLabel = (index: number) => `**${index + 1}.**`;

export const buildPollTournamentFinalResultsMessage = ({
  tournament,
  finalists,
}: {
  tournament: PollTournamentView;
  finalists: PollFinalistResult[];
}): MessageCreateOptions & { content: string } => {
  const optionsById = new Map(
    tournament.options.map((option) => [option.id, option]),
  );
  const lines = rankFinalists(finalists).map((finalist, index) => {
    const option = optionsById.get(finalist.optionId);

    return `${getPlacementLabel(index)} ${option?.text ?? 'Unknown option'}: **${finalist.finalVotes}** final votes (**${finalist.totalVotes}** total)`;
  });

  return {
    content: [
      `**${tournament.title} results**`,
      ...lines,
      '',
      'Exact final-vote ties are resolved by the random tiebreak order drawn when the tournament starts.',
    ].join('\n'),
    allowedMentions: { parse: [] },
  };
};
