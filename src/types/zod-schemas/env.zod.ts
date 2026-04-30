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
  PORT: z.coerce.number().int().positive().default(8000),
});

export const env = envSchema.parse(process.env);
