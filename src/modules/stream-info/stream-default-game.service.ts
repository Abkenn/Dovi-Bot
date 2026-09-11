import type { Client } from 'discord.js';
import { refreshRelevantTrackedStreamAnnouncements } from './stream-announcement-refresh.service';
import { setDefaultGameName } from './stream-info.service';

type SetDefaultStreamGameInput = {
  client: Client;
  gameName: string;
  guildId: string;
};

export const setDefaultStreamGame = async ({
  client,
  gameName,
  guildId,
}: SetDefaultStreamGameInput) => {
  await setDefaultGameName(guildId, gameName);
  await refreshRelevantTrackedStreamAnnouncements({ client, guildId });
};
