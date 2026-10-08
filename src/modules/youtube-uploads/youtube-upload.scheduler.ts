import type { Client } from 'discord.js';
import { DateTime } from 'luxon';
import { announceNewYouTubeUploads } from './youtube-upload.service';

const YOUTUBE_UPLOAD_POLL_INTERVAL_MS = 5 * 60 * 1000;
const RECENT_UPLOAD_POLL_INTERVAL_MS = 6 * 60 * 60 * 1000;
const RECENT_UPLOAD_QUIET_PERIOD_HOURS = 18;
const INITIAL_UPLOAD_POLL_DELAY_MS = 20_000;

let scheduledPoll: NodeJS.Timeout | undefined;
let activePoll: Promise<Date | null> | undefined;

export const getYouTubeUploadPollDelayMs = (
  latestPublishedAt: Date | null,
  now: DateTime = DateTime.utc(),
): number => {
  if (latestPublishedAt) {
    const quietPeriodRemainingMs =
      DateTime.fromJSDate(latestPublishedAt)
        .plus({ hours: RECENT_UPLOAD_QUIET_PERIOD_HOURS })
        .toMillis() - now.toMillis();
    if (quietPeriodRemainingMs > 0) {
      return Math.min(RECENT_UPLOAD_POLL_INTERVAL_MS, quietPeriodRemainingMs);
    }
  }

  return YOUTUBE_UPLOAD_POLL_INTERVAL_MS;
};

const pollForUploads = (client: Client) => {
  if (activePoll) {
    return activePoll;
  }

  activePoll = announceNewYouTubeUploads(client)
    .catch((error) => {
      console.error('YouTube upload poll failed', error);
      return null;
    })
    .finally(() => {
      activePoll = undefined;
    });
  return activePoll;
};

const scheduleUploadPoll = (client: Client, delayMs: number) => {
  scheduledPoll = setTimeout(async () => {
    const latestPublishedAt = await pollForUploads(client);
    scheduleUploadPoll(client, getYouTubeUploadPollDelayMs(latestPublishedAt));
  }, delayMs);
  scheduledPoll.unref();
};

export const startYouTubeUploadScheduler = (client: Client) => {
  if (scheduledPoll) {
    return;
  }

  scheduleUploadPoll(client, INITIAL_UPLOAD_POLL_DELAY_MS);
};
