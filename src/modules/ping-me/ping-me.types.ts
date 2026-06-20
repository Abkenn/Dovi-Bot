export type PingMeGuildBoundary = {
  stagingGuildId: string;
  prodGuildId: string;
};

export type PingMeNotification = {
  userId: string;
  matchedKeywords: string[];
};

export type PingMeCommandInput = {
  userId: string;
  sourceGuildId: string;
  keywordsInput: string | null;
  clear: boolean;
};

export type PingMeCommandResult = {
  content: string;
};

export type PingMeMessageInput = {
  guildId: string;
  authorUserId: string;
  content: string;
};
export type PingMeGuildCommand = {
  id: string;
  name: string;
};

export type PingMeGuildCommandCollection = {
  values: () => IterableIterator<PingMeGuildCommand>;
};

export type RemoveDisabledProdPingMeCommandInput = {
  fetch: (options: {
    guildId: string;
  }) => Promise<PingMeGuildCommandCollection>;
  deleteCommand: (commandId: string, guildId: string) => Promise<unknown>;
  commandName: string;
  prodGuildId: string;
  prodRegistrationEnabled: boolean;
};
