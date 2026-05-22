import {
  isDaviBossStatsSyncConfigured,
  syncDaviBossStats,
} from './davi-boss-stats-sync.service';
import { formatDaviBossStatsSyncSummary } from './davi-boss-stats-sync.types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SCHEDULED_SYNC_TIMEOUT_MS = 60_000;

let interval: NodeJS.Timeout | undefined;
let activeSync: Promise<unknown> | undefined;

const runScheduledSync = async () => {
  if (activeSync) {
    return activeSync;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, SCHEDULED_SYNC_TIMEOUT_MS);

  activeSync = syncDaviBossStats({ signal: abortController.signal })
    .then((result) => {
      console.info(formatDaviBossStatsSyncSummary(result));
    })
    .catch((error) => {
      console.error('Davi boss stats sync failed', error);
    })
    .finally(() => {
      clearTimeout(timeout);
      activeSync = undefined;
    });

  return activeSync;
};

export const startDaviBossStatsSyncScheduler = () => {
  if (!isDaviBossStatsSyncConfigured()) {
    console.info('Davi boss stats sync scheduler skipped: config is missing.');
    return;
  }

  void runScheduledSync();

  if (interval) {
    return;
  }

  interval = setInterval(() => {
    void runScheduledSync();
  }, ONE_DAY_MS);

  interval.unref();
};
