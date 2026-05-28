import type { SapphireClient } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { createBot } from './create-bot';
import { notifyDeploymentFailed } from './deployment-notifications';
import {
  markDiscordLoginFailed,
  markDiscordReady,
  markDiscordStarting,
} from './runtime-health';

type StartBotOptions = {
  shutdownHandler?: (bot: SapphireClient) => void;
};

const DISCORD_LOGIN_RETRY_MS = 30_000;

const scheduleDiscordLogin = (bot: SapphireClient) => {
  markDiscordStarting();

  void bot
    .login(env.DISCORD_TOKEN)
    .then(() => {
      markDiscordReady();
      console.log(`Bot logged in as ${bot.user?.tag ?? 'unknown'}`);
    })
    .catch((error) => {
      markDiscordLoginFailed(error);
      console.error('Discord login failed. Retrying soon.', error);
      void notifyDeploymentFailed(error).catch((notificationError) => {
        console.error(
          'Failed to send deployment failure DM.',
          notificationError,
        );
      });

      const retry = setTimeout(() => {
        scheduleDiscordLogin(bot);
      }, DISCORD_LOGIN_RETRY_MS);

      retry.unref();
    });
};

export function startBot(options: StartBotOptions = {}) {
  const bot = createBot();

  options.shutdownHandler?.(bot);

  scheduleDiscordLogin(bot);

  return bot;
}
