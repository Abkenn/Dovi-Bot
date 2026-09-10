import type { Client } from 'discord.js';
import { DateTime } from 'luxon';
import { isStreamAnnouncementWatchWindow } from './stream-announcement-watch';
import { refreshLastStreamInfoMessages } from './stream-info-message-updater.service';

const STREAM_INFO_MESSAGE_REFRESH_INTERVAL_MS = 15_000;
const NORMAL_STREAM_INFO_MESSAGE_REFRESH_INTERVAL_MS = 60_000;
const INITIAL_REFRESH_DELAY_MS = 12_000;
const STARTUP_RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;

let interval: NodeJS.Timeout | undefined;
let activeRefresh: Promise<void> | undefined;
let lastNormalRefreshAtMs = 0;

const wait = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

const refreshWithStartupRetries = async (client: Client) => {
  for (const retryDelayMs of STARTUP_RETRY_DELAYS_MS) {
    try {
      await refreshLastStreamInfoMessages(client);
      return;
    } catch (error) {
      console.warn(
        `Stream info startup refresh failed; retrying in ${retryDelayMs}ms`,
        error,
      );
      await wait(retryDelayMs);
    }
  }

  await refreshLastStreamInfoMessages(client).catch((error) => {
    console.warn('Stream info startup refresh failed', error);
  });
};

const runScheduledRefresh = (client: Client, isStartup = false) => {
  if (activeRefresh) {
    return activeRefresh;
  }

  const refresh = isStartup
    ? refreshWithStartupRetries(client)
    : refreshLastStreamInfoMessages(client).catch((error) => {
        console.error('Stream info message refresh failed', error);
      });

  activeRefresh = refresh.finally(() => {
    activeRefresh = undefined;
  });
  return activeRefresh;
};

export const startStreamInfoMessageUpdater = (client: Client) => {
  if (interval) {
    return;
  }

  lastNormalRefreshAtMs = Date.now();

  const initialRefresh = setTimeout(() => {
    void runScheduledRefresh(client, true);
  }, INITIAL_REFRESH_DELAY_MS);
  initialRefresh.unref();

  interval = setInterval(() => {
    const nowMs = Date.now();
    const isWatchWindow = isStreamAnnouncementWatchWindow(DateTime.utc());
    const normalRefreshDue =
      nowMs - lastNormalRefreshAtMs >=
      NORMAL_STREAM_INFO_MESSAGE_REFRESH_INTERVAL_MS;
    if (!isWatchWindow && !normalRefreshDue) {
      return;
    }
    if (!isWatchWindow) {
      lastNormalRefreshAtMs = nowMs;
    }
    void runScheduledRefresh(client);
  }, STREAM_INFO_MESSAGE_REFRESH_INTERVAL_MS);

  interval.unref();
};
