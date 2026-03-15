import { env } from '@zod-schemas/env.zod';
import { createBot } from './create-bot';

export function startBot() {
  const bot = createBot();

  void bot.login(env.DISCORD_TOKEN).then(() => {
    console.log(`Bot logged in as ${bot.user?.tag ?? 'unknown'}`);
  });

  return bot;
}
