import { POLL_TOURNAMENT_CONFIG } from './poll-tournament.config';
import {
  POLL_TOURNAMENT_ROUND_KINDS,
  type PollFinalistResult,
  type PollTournamentPlan,
  type PollTournamentRoundPlan,
} from './poll-tournament.types';

const collapseWhitespace = (value: string): string => {
  let normalized = '';
  let previousWasWhitespace = false;

  for (const character of value) {
    const isWhitespace = character.trim().length === 0;

    if (isWhitespace) {
      if (normalized.length > 0 && !previousWasWhitespace) {
        normalized += ' ';
      }
    } else {
      normalized += character;
    }

    previousWasWhitespace = isWhitespace;
  }

  return normalized.trim();
};

export const normalizePollOption = (value: string): string =>
  cleanPollText(value).toLocaleLowerCase('en-US');

export const cleanPollText = (value: string): string =>
  collapseWhitespace(value.normalize('NFKC'));

const buildBalancedSizes = (optionCount: number, bracketCount: number) => {
  const baseSize = Math.floor(optionCount / bracketCount);
  const largerBracketCount = optionCount % bracketCount;
  const smallerBracketCount = bracketCount - largerBracketCount;

  return [
    ...Array.from({ length: smallerBracketCount }, () => baseSize),
    ...Array.from({ length: largerBracketCount }, () => baseSize + 1),
  ];
};

const buildEliminationRounds = (
  initialWinnerCount: number,
): PollTournamentRoundPlan[] => {
  const rounds: PollTournamentRoundPlan[] = [];
  let optionCount = initialWinnerCount;

  while (optionCount > 5) {
    const minimumBrackets = Math.ceil(optionCount / 4);
    const maximumBrackets = Math.floor(optionCount / 2);
    const preferredBrackets =
      optionCount === 6 ? 2 : Math.max(3, Math.floor(optionCount / 3));
    const bracketCount = Math.min(
      maximumBrackets,
      Math.max(minimumBrackets, preferredBrackets),
    );

    rounds.push({
      kind: POLL_TOURNAMENT_ROUND_KINDS.ELIMINATION,
      bracketSizes: buildBalancedSizes(optionCount, bracketCount),
    });
    optionCount = bracketCount;
  }

  rounds.push({
    kind: POLL_TOURNAMENT_ROUND_KINDS.FINAL,
    bracketSizes: [optionCount],
  });

  return rounds;
};

const getPlanDurationDays = (rounds: PollTournamentRoundPlan[]) =>
  rounds.reduce((total, round) => total + round.bracketSizes.length + 2, 0);

const buildQualificationPlan = (
  nominationCount: number,
  bracketCount: number,
): PollTournamentPlan => {
  const rounds: PollTournamentRoundPlan[] = [
    {
      kind: POLL_TOURNAMENT_ROUND_KINDS.QUALIFICATION,
      bracketSizes: buildBalancedSizes(nominationCount, bracketCount),
    },
    ...buildEliminationRounds(bracketCount),
  ];

  return { durationDays: getPlanDurationDays(rounds), rounds };
};

export const buildPollTournamentPlan = (
  nominationCount: number,
): PollTournamentPlan => {
  if (nominationCount < POLL_TOURNAMENT_CONFIG.minOptions) {
    throw new Error(
      `A poll needs at least ${POLL_TOURNAMENT_CONFIG.minOptions} unique nominations.`,
    );
  }

  if (nominationCount < 4) {
    return {
      durationDays: 3,
      rounds: [
        {
          kind: POLL_TOURNAMENT_ROUND_KINDS.FINAL,
          bracketSizes: [nominationCount],
        },
      ],
    };
  }

  const minimumBrackets = Math.max(
    2,
    Math.ceil(nominationCount / POLL_TOURNAMENT_CONFIG.maxOptionsPerBracket),
  );
  const minimumFiveOptionBrackets = Math.max(
    minimumBrackets,
    Math.ceil(nominationCount / 5),
  );
  const maximumBrackets = Math.floor(nominationCount / 2);
  const targetQualificationBrackets =
    nominationCount === 9
      ? 3
      : Math.round(
          nominationCount / POLL_TOURNAMENT_CONFIG.targetQualificationOptions,
        );
  const preferredBrackets = Math.min(
    maximumBrackets,
    Math.max(minimumBrackets, targetQualificationBrackets),
  );

  for (
    let bracketCount = preferredBrackets;
    bracketCount >= minimumFiveOptionBrackets;
    bracketCount -= 1
  ) {
    const plan = buildQualificationPlan(nominationCount, bracketCount);

    if (plan.durationDays <= POLL_TOURNAMENT_CONFIG.preferredDurationDays) {
      return plan;
    }
  }

  const maxDurationDays =
    nominationCount >= POLL_TOURNAMENT_CONFIG.hugeTournamentThreshold
      ? POLL_TOURNAMENT_CONFIG.hugeTournamentMaxDurationDays
      : POLL_TOURNAMENT_CONFIG.maxDurationDays;
  const fiveOptionPlan = buildQualificationPlan(
    nominationCount,
    minimumFiveOptionBrackets,
  );

  if (fiveOptionPlan.durationDays <= maxDurationDays) {
    return fiveOptionPlan;
  }

  for (
    let bracketCount = minimumFiveOptionBrackets - 1;
    bracketCount >= minimumBrackets;
    bracketCount -= 1
  ) {
    const plan = buildQualificationPlan(nominationCount, bracketCount);

    if (plan.durationDays <= maxDurationDays) {
      return plan;
    }
  }

  throw new Error(
    `A ${nominationCount}-option tournament cannot finish within ${maxDurationDays} days. Remove some nominations before starting.`,
  );
};

export const rankFinalists = (
  finalists: PollFinalistResult[],
): PollFinalistResult[] =>
  [...finalists].sort(
    (left, right) =>
      right.finalVotes - left.finalVotes ||
      left.tieBreakOrder - right.tieBreakOrder,
  );
