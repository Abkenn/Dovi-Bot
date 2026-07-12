import { BOT_GUILDS } from '../config/discord-access';
import { isUnknownRecord } from '../lib/type-guards';
import { getCachedEmbeddedAppStats } from '../modules/embedded-app/embedded-app-stats-cache.service';
import type {} from '../types/embedded-app-global';

type TanStackStartServerEntry = {
  fetch: (request: Request) => Response | Promise<Response>;
};

type LoadTanStackStartServerEntry = () => Promise<unknown>;

const isTanStackStartServerEntry = (
  value: unknown,
): value is TanStackStartServerEntry =>
  isUnknownRecord(value) && typeof value.fetch === 'function';

export const createTanStackStartFetcher = (
  loadEntry: LoadTanStackStartServerEntry,
) => {
  let pendingEntry: Promise<TanStackStartServerEntry> | undefined;

  return async (request: Request) => {
    if (!pendingEntry) {
      pendingEntry = loadEntry().then((module) => {
        if (
          !isUnknownRecord(module) ||
          !isTanStackStartServerEntry(module.default)
        ) {
          throw new Error('The TanStack Start server entry is invalid.');
        }

        return module.default;
      });
    }

    return (await pendingEntry).fetch(request);
  };
};

const serverEntryPath = '../../embedded-app/dist/server/index.js';
const fetchTanStackStart = createTanStackStartFetcher(
  () => import(serverEntryPath),
);

export const registerEmbeddedAppStatsLoader = () => {
  globalThis.__doviEmbeddedAppStatsLoader = () =>
    getCachedEmbeddedAppStats(BOT_GUILDS.STAGING_ENV);
};

export const fetchEmbeddedApp = fetchTanStackStart;
