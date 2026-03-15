import 'dotenv/config';

import { SapphireClient } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { GatewayIntentBits } from 'discord.js';

const client = new SapphireClient({
  intents: [GatewayIntentBits.Guilds],
  loadMessageCommandListeners: false,
});

void client.login(env.DISCORD_TOKEN);
