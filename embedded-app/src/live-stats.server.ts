import type { LiveStats } from './live-stats.types';

const loadDevelopmentStats = async (): Promise<LiveStats> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The embedded stats service bridge is unavailable.');
  }

  const guildId = process.env.DISCORD_STAGING_ENV_GUILD_ID;
  if (!guildId) {
    throw new Error('DISCORD_STAGING_ENV_GUILD_ID is not set.');
  }
  const { getCachedEmbeddedAppStats } = await import(
    '../../src/modules/embedded-app/embedded-app-stats-cache.service'
  );

  return getCachedEmbeddedAppStats(guildId);
};

export const loadLiveStatsPayload = async () => {
  const statsLoader = globalThis.__doviEmbeddedAppStatsLoader;
  const stats = statsLoader
    ? await statsLoader()
    : await loadDevelopmentStats();

  return {
    stats,
    discordClientId: process.env.DISCORD_CLIENT_ID ?? '',
  };
};
