import { invalidateEmbeddedAppStatsCache } from '../embedded-app/embedded-app-stats-cache.service';
import { refreshRelevantTrackedStreamAnnouncements } from './stream-announcement-refresh.service';
import { setDefaultGameName } from './stream-info.service';
import type { SetDefaultStreamGameInput } from './stream-info.types';

export const setDefaultStreamGame = async ({
  client,
  gameName,
  guildId,
  app = false,
}: SetDefaultStreamGameInput) => {
  const cleanGameName = gameName.trim();
  if (!cleanGameName) throw new Error('Enter a game name.');
  await setDefaultGameName(guildId, cleanGameName, app);
  if (app) invalidateEmbeddedAppStatsCache(guildId);
  await refreshRelevantTrackedStreamAnnouncements({ client, guildId });
};
