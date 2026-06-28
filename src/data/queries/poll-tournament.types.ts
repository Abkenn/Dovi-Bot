export type CreatePollTournamentInput = {
  guildId: string;
  hostUserId: string;
  hostChannelId: string;
  title: string;
  maxNominationsPerUser: number;
};

export type FindAccessiblePollTournamentsInput = {
  userId: string;
  canAccessAll: boolean;
};
