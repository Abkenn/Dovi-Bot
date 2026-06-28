import type { MessageCreateOptions } from 'discord.js';
import type { PollTournamentView } from '../../data/queries/poll-tournament';
import { buildPollTournamentFinalResultsMessage } from './poll-tournament.discord';
import type { PollFinalistResult } from './poll-tournament.types';

export type PollSemifinalistResult = {
  optionId: string;
  semifinalVotes: number;
  totalVotes: number;
};

export const buildExtendedPollTournamentResultsMessage = ({
  tournament,
  finalists,
  semifinalists,
}: {
  tournament: PollTournamentView;
  finalists: PollFinalistResult[];
  semifinalists: PollSemifinalistResult[];
}): MessageCreateOptions => {
  const base = buildPollTournamentFinalResultsMessage({
    tournament,
    finalists,
  });

  if (semifinalists.length === 0) {
    return base;
  }

  const optionsById = new Map(
    tournament.options.map((option) => [option.id, option.text]),
  );
  const lines = semifinalists
    .map((semifinalist) => ({
      ...semifinalist,
      text: optionsById.get(semifinalist.optionId) ?? 'Unknown option',
    }))
    .sort((left, right) => left.text.localeCompare(right.text))
    .map(
      ({ text, semifinalVotes, totalVotes }) =>
        `- ${text}: **${semifinalVotes}** semifinal votes (**${totalVotes}** total)`,
    );

  return {
    ...base,
    content: [
      base.content,
      '',
      '**Other semifinalists (unranked across separate polls)**',
      ...lines,
    ].join('\n'),
  };
};
