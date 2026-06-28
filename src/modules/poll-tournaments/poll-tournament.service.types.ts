import type { PollTournamentView } from '../../data/queries/poll-tournament';

export type HostPollTournamentInput = {
  guildId: string;
  hostUserId: string;
  hostChannelId: string;
  title: string;
  maxNominationsPerUser: number;
};

export type NominatePollTournamentInput = {
  guildId: string;
  tournamentId: string;
  nominatorUserId: string;
  optionInputs: Array<string | null>;
};

export type StartPollTournamentInput = {
  tournamentId: string;
  hostUserId: string;
  now?: Date;
};

export type ManagePollTournamentInput = {
  tournamentId: string;
  normalizedOption: string;
  userId: string;
};

export type PollTournamentStartResult = {
  tournament: PollTournamentView;
};
