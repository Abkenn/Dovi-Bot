import { BOT_GUILDS } from './discord-access';
import type { LogLevelConfig, LogLevelContext } from './log-level.types';

export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export const LOG_LEVEL_CONFIG: LogLevelConfig = {
  defaultLevel: LOG_LEVEL.INFO,
  rules: [
    {
      level: LOG_LEVEL.DEBUG,
      matches: ({ guildId }) => guildId === BOT_GUILDS.STAGING_ENV,
    },
  ],
};

export const getLogLevel = (context: LogLevelContext = {}) =>
  context.override ??
  LOG_LEVEL_CONFIG.rules.find((rule) => rule.matches(context))?.level ??
  LOG_LEVEL_CONFIG.defaultLevel;

export const isDebugLevel = (context: LogLevelContext) =>
  getLogLevel(context) === LOG_LEVEL.DEBUG;
