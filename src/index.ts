import 'dotenv/config';

import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
});

const env = envSchema.parse(process.env);

const client = new SapphireClient({
  intents: [GatewayIntentBits.Guilds],
});

void client.login(env.DISCORD_TOKEN);
