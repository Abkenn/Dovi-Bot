import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';

export function createBot() {
  return new SapphireClient({
    intents: [GatewayIntentBits.Guilds],
    loadMessageCommandListeners: false,
  });
}
