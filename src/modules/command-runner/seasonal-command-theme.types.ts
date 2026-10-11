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
  avatar?: SeasonalAvatar;
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

export type SeasonalAvatar = {
  environments: readonly ('STAGING_ENV' | 'PROD_ENV')[];
  image: URL;
  // Optional event asset used between random windows; otherwise inherit global avatar.
  outsideWindowImage?: URL;
  schedule:
    | { mode: 'continuous' }
    | { mode: 'random-window'; intervalMs: number; durationMs: number };
};
