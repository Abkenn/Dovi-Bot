import { z } from 'zod';

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
  DAVI_BOSS_STATS_SPREADSHEET_URL: z.url().optional(),
  DAVI_DISCORD_USER_ID: z.string().min(1).optional(),
  YOUTUBE_API_KEY: z.string().min(1).optional(),
  YOUTUBE_CHANNEL_HANDLES: z.string().min(1).optional(),
  ENABLE_MEMORY_LOGGING: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DEPLOYMENT_NOTIFY_USER_ID: z.string().min(1).optional(),
  DEPLOYMENT_CHANGELOG_GITHUB_TOKEN: z.string().min(1).optional(),
  UPTIME_STATUS_MONITOR_URL: z.url().optional(),
  UPTIME_STATUS_MONITOR_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(300_000),
  HEALTH_CHECK_MONITOR_URL: z.url().optional(),
  HEALTH_CHECK_MONITOR_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(86_400_000),
  KOYEB_GIT_SHA: z.string().min(1).optional(),
  KOYEB_GIT_BRANCH: z.string().min(1).optional(),
  KOYEB_GIT_REPOSITORY: z.string().min(1).optional(),
  KOYEB_GIT_COMMIT_MESSAGE: z.string().min(1).optional(),
  KOYEB_GIT_COMMIT_AUTHOR: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(8000),
});

export const env = envSchema.parse(process.env);
