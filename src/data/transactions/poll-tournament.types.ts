import type { PollTournamentRoundKind } from '../../generated/prisma/enums';

export type PollTournamentNominationValue = {
  text: string;
  normalizedText: string;
};

export type NominatePollTournamentInput = {
  tournamentId: string;
  guildId: string;
  nominatorUserId: string;
  nominations: PollTournamentNominationValue[];
};

export type RemovePollTournamentNominationInput = {
  tournamentId: string;
  normalizedText: string;
  removedByUserId: string;
  removedAt: Date;
};

export type PollTournamentStartOption = {
  text: string;
  normalizedText: string;
  seedOrder: number;
  tieBreakOrder: number;
};

export type PollTournamentStartRound = {
  kind: PollTournamentRoundKind;
  bracketSizes: number[];
};

export type FinalizePollTournamentStartInput = {
  tournamentId: string;
  plannedDurationDays: number;
  startedAt: Date;
  bracketStartIntervalMs: number;
  pollDurationMs: number;
  options: PollTournamentStartOption[];
  rounds: PollTournamentStartRound[];
};

export type ActivatePollTournamentBracketInput = {
  bracketId: string;
  messageId: string;
  startedAt: Date;
  endsAt: Date;
  bracketStartIntervalMs: number;
};
export type CompletePollTournamentBracketInput = {
  bracketId: string;
  results: Array<{ entryId: string; voteCount: number }>;
};

export type AdvancePollTournamentRoundInput = {
  currentRoundId: string;
  winnerOptionIds: string[];
  nextStartsAt: Date;
  bracketStartIntervalMs: number;
  pollDurationMs: number;
};
