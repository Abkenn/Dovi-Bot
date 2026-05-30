import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.url().optional(),
);

export const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_STAGING_ENV_GUILD_ID: z.string().min(1),
  DISCORD_PROD_ENV_GUILD_ID: z.string().min(1),
  ENABLE_PROD_GUILD_COMMAND_REGISTRATION: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  DAVI_BOSS_STATS_SPREADSHEET_URL: optionalUrl,
  DAVI_DISCORD_USER_ID: optionalNonEmptyString,
  YOUTUBE_API_KEY: optionalNonEmptyString,
  YOUTUBE_CHANNEL_HANDLES: optionalNonEmptyString,
  ENABLE_COMMUNITY_TOPIC_TRACKING: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  COMMUNITY_TOPIC_TRACKING_CHANNELS: optionalNonEmptyString,
  ENABLE_MEMORY_LOGGING: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DEPLOYMENT_NOTIFY_USER_ID: optionalNonEmptyString,
  DEPLOYMENT_CHANGELOG_GITHUB_TOKEN: optionalNonEmptyString,
  UPTIME_STATUS_MONITOR_URL: optionalUrl,
  UPTIME_STATUS_MONITOR_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(300_000),
  HEALTH_CHECK_MONITOR_URL: optionalUrl,
  HEALTH_CHECK_MONITOR_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(86_400_000),
  KOYEB_GIT_SHA: optionalNonEmptyString,
  KOYEB_GIT_BRANCH: optionalNonEmptyString,
  KOYEB_GIT_REPOSITORY: optionalNonEmptyString,
  KOYEB_GIT_COMMIT_MESSAGE: optionalNonEmptyString,
  KOYEB_GIT_COMMIT_AUTHOR: optionalNonEmptyString,
  PORT: z.coerce.number().int().positive().default(8000),
});

export const env = envSchema.parse(process.env);
