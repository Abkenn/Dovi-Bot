export const POLL_TOURNAMENT_ROUND_KINDS = {
  QUALIFICATION: 'QUALIFICATION',
  ELIMINATION: 'ELIMINATION',
  FINAL: 'FINAL',
} as const;

export type PollTournamentRoundKind =
  (typeof POLL_TOURNAMENT_ROUND_KINDS)[keyof typeof POLL_TOURNAMENT_ROUND_KINDS];

export type PollTournamentRoundPlan = {
  kind: PollTournamentRoundKind;
  bracketSizes: number[];
};

export type PollTournamentPlan = {
  durationDays: number;
  rounds: PollTournamentRoundPlan[];
};

export type PollFinalistResult = {
  optionId: string;
  finalVotes: number;
  totalVotes: number;
  tieBreakOrder: number;
};
