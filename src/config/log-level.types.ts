export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogLevelContext = {
  guildId?: string | null;
  override?: LogLevel;
};

export type LogLevelRule = {
  level: LogLevel;
  matches: (context: LogLevelContext) => boolean;
};

export type LogLevelConfig = {
  defaultLevel: LogLevel;
  rules: readonly LogLevelRule[];
};
