export type SeasonalReplyCadence = {
  every: number;
  first: boolean;
  repeats: 'allow' | 'skip' | 'normal-and-reset';
};

export type SeasonalTheme = {
  id: string;
  accentColor: number;
  emoji: string;
  embed: SeasonalReplyCadence;
  text: SeasonalReplyCadence;
  effects?: {
    emojiLifetimeMs: number;
    activityButton?: { delayMs: number; durationMs: number; cycleMs?: number };
    titlePulse?: SeasonalTitlePulse;
  };
};

export type SeasonalTitlePulse = {
  visibleMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  lifetimeMs: number;
};

export type SeasonalReplySelectionInput = {
  scope: string;
  userId: string;
  kind: 'embed' | 'text';
  theme: SeasonalTheme;
};
