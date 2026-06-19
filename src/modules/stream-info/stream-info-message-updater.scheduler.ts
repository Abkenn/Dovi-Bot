import type { Client } from 'discord.js';
import { refreshLastStreamInfoMessages } from './stream-info-message-updater.service';

const STREAM_INFO_MESSAGE_REFRESH_INTERVAL_MS = 60_000;

let interval: NodeJS.Timeout | undefined;
let activeRefresh: Promise<unknown> | undefined;

const runScheduledRefresh = async (client: Client) => {
  if (activeRefresh) {
    return activeRefresh;
  }

  activeRefresh = refreshLastStreamInfoMessages(client)
    .catch((error) => {
      console.error('Stream info message refresh failed', error);
    })
    .finally(() => {
      activeRefresh = undefined;
    });

  return activeRefresh;
};

export const startStreamInfoMessageUpdater = (client: Client) => {
  void runScheduledRefresh(client);

  if (interval) {
    return;
  }

  interval = setInterval(() => {
    void runScheduledRefresh(client);
  }, STREAM_INFO_MESSAGE_REFRESH_INTERVAL_MS);

  interval.unref();
};
