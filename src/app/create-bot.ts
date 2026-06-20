import { SapphireClient } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { GatewayIntentBits } from 'discord.js';

export function createBot() {
  const intents = [GatewayIntentBits.Guilds];

  if (env.ENABLE_COMMUNITY_TOPIC_TRACKING) {
    intents.push(
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    );
  }

  return new SapphireClient({
    intents,
    loadMessageCommandListeners: false,
  });
}