export type SeasonalButtonSnapshot = {
  customId: string;
  emoji: {
    id?: string | undefined;
    name?: string | undefined;
    animated?: boolean | undefined;
  } | null;
};

export type SaveSeasonalMessageEffectInput = {
  messageId: string;
  guildId: string;
  channelId: string;
  startedAt: Date;
  buttonSwapAt: Date;
  buttonRestoreAt: Date;
  eyeExpiresAt: Date;
  eyeEmoji: string;
  originalButtons: SeasonalButtonSnapshot[];
};
