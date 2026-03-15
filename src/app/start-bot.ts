import type { SapphireClient } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { createBot } from './create-bot';

type StartBotOptions = {
  shutdownHandler?: (bot: SapphireClient) => void;
};

export function startBot(options: StartBotOptions = {}) {
  const bot = createBot();

  options.shutdownHandler?.(bot);

  void bot.login(env.DISCORD_TOKEN).then(() => {
    console.log(`Bot logged in as ${bot.user?.tag ?? 'unknown'}`);
  });

  return bot;
}
