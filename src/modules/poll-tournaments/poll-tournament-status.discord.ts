import type { PollTournamentView } from '../../data/queries/poll-tournament';
import { PollTournamentStatus } from '../../generated/prisma/enums';

const appendLine = (pages: string[], line: string) => {
  const pageIndex = pages.length - 1;
  const page = pages[pageIndex] ?? '';
  const nextPage = page ? `${page}\n${line}` : line;

  if (nextPage.length <= 1_900) {
    pages[pageIndex] = nextPage;
    return;
  }

  pages.push(line);
};

const getUniqueNominationTexts = (tournament: PollTournamentView) => {
  const options = new Map<string, string>();

  for (const nomination of tournament.nominations) {
    if (!options.has(nomination.normalizedText)) {
      options.set(nomination.normalizedText, nomination.text);
    }
  }

  return [...options.values()];
};

const getProgress = (tournament: PollTournamentView) => {
  const activeRound = tournament.rounds.find(
    ({ status }) => status === 'ACTIVE',
  );

  if (!activeRound) {
    return 'Finishing the tournament now.';
  }

  const completed = activeRound.brackets.filter(
    ({ status }) => status === 'COMPLETE',
  ).length;

  return `Layer ${activeRound.roundNumber}/${tournament.rounds.length}: ${completed}/${activeRound.brackets.length} brackets complete.`;
};

export const buildPollTournamentStatusPages = (
  tournaments: PollTournamentView[],
): string[] => {
  if (tournaments.length === 0) {
    return ['You have no active hosted polls.'];
  }

  const pages = [''];

  for (const tournament of tournaments) {
    if (pages[pages.length - 1]) {
      appendLine(pages, '');
    }

    appendLine(pages, `**${tournament.title}**`);

    if (tournament.status === PollTournamentStatus.NOMINATING) {
      const options = getUniqueNominationTexts(tournament);
      appendLine(pages, 'Status: Nominations open');
      appendLine(pages, `Unique nominations: ${options.length}`);
      appendLine(
        pages,
        `Limit per person: ${tournament.maxNominationsPerUser}`,
      );

      if (options.length === 0) {
        appendLine(pages, 'No nominations yet.');
      } else {
        for (const [index, option] of options.entries()) {
          appendLine(pages, `${index + 1}. ${option}`);
        }
      }
    } else if (tournament.status === PollTournamentStatus.STARTING) {
      appendLine(pages, 'Status: Starting now.');
    } else {
      appendLine(
        pages,
        tournament.status === PollTournamentStatus.FINALIZING
          ? 'Status: Finalizing results'
          : 'Status: In progress',
      );
      appendLine(pages, getProgress(tournament));
    }
  }

  return pages;
};
