import type { SapphireClient } from '@sapphire/framework';

export function setupShutdown(bot: SapphireClient) {
  const shutdown = () => {
    console.log('Shutting down...');
    bot.destroy();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
