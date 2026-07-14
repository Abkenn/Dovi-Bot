import { BOT_GUILDS } from '../config/discord-access';
import { getEmbeddedAppLaunchTarget } from '../modules/embedded-app/embedded-app-launch-target.service';
import type { EmbeddedAppStats } from '../modules/embedded-app/embedded-app-stats.types';
import { getCachedEmbeddedAppStats } from '../modules/embedded-app/embedded-app-stats-cache.service';
import { createEmbeddedAppSsrWorker } from './embedded-app-ssr-worker';

export type EmbeddedAppWorkerRequest = {
  id: number;
  request: {
    url: string;
    method: string;
    headers: [string, string][];
    body: ArrayBuffer | null;
  };
  stats: EmbeddedAppStats;
};

export type EmbeddedAppWorkerResponse = {
  id: number;
  response?: {
    status: number;
    statusText: string;
    headers: [string, string][];
    body: ArrayBuffer;
  };
  error?: string;
};

export type EmbeddedAppSsrWorker = {
  postMessage: (message: EmbeddedAppWorkerRequest) => void;
  onMessage: (listener: (message: EmbeddedAppWorkerResponse) => void) => void;
  onError: (listener: (error: Error) => void) => void;
  onExit: (listener: (code: number) => void) => void;
  terminate: () => void;
};

type PendingResponse = {
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
};

type CreateEmbeddedAppSsrWorker = () => EmbeddedAppSsrWorker;
type LoadEmbeddedAppStats = (request: Request) => Promise<EmbeddedAppStats>;

const SSR_WORKER_MAX_RENDERS = 25;

export const createEmbeddedAppWorkerFetcher = (
  loadStats: LoadEmbeddedAppStats,
  createSsrWorker: CreateEmbeddedAppSsrWorker = createEmbeddedAppSsrWorker,
) => {
  let worker: EmbeddedAppSsrWorker | undefined;
  let nextRequestId = 1;
  const pending = new Map<number, PendingResponse>();

  const rejectPending = (error: Error) => {
    for (const response of pending.values()) {
      response.reject(error);
    }
    pending.clear();
    worker = undefined;
  };

  const getWorker = () => {
    if (worker) {
      return worker;
    }

    const startedWorker = createSsrWorker();
    let handledRenders = 0;
    let terminating = false;
    worker = startedWorker;
    startedWorker.onMessage((message) => {
      const response = pending.get(message.id);
      if (!response) {
        return;
      }

      pending.delete(message.id);
      handledRenders += 1;
      if (message.error || !message.response) {
        response.reject(
          new Error(message.error ?? 'The embedded app SSR response is empty.'),
        );
      } else {
        response.resolve(
          new Response(message.response.body, {
            status: message.response.status,
            statusText: message.response.statusText,
            headers: message.response.headers,
          }),
        );
      }

      if (handledRenders >= SSR_WORKER_MAX_RENDERS && pending.size === 0) {
        terminating = true;
        worker = undefined;
        startedWorker.terminate();
      }
    });
    startedWorker.onError(rejectPending);
    startedWorker.onExit((code) => {
      if (worker === startedWorker) {
        worker = undefined;
      }
      if (code !== 0 && !terminating) {
        rejectPending(
          new Error(`The embedded app SSR worker exited (${code}).`),
        );
      }
    });

    return startedWorker;
  };

  return async (request: Request) => {
    const [stats, body] = await Promise.all([
      loadStats(request),
      request.method === 'GET' || request.method === 'HEAD'
        ? Promise.resolve(null)
        : request.arrayBuffer(),
    ]);
    const id = nextRequestId;
    nextRequestId += 1;

    const response = new Promise<Response>((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });

    getWorker().postMessage({
      id,
      request: {
        url: request.url,
        method: request.method,
        headers: [...request.headers.entries()],
        body,
      },
      stats,
    });

    return response;
  };
};

export const loadEmbeddedAppStatsForRequest = async (request: Request) => {
  const url = new URL(request.url);
  const requestedGuildId = url.searchParams.get('guild_id');

  if (
    requestedGuildId &&
    requestedGuildId !== BOT_GUILDS.STAGING_ENV &&
    requestedGuildId !== BOT_GUILDS.PROD_ENV
  ) {
    throw new Error('Embedded app request came from an unsupported guild.');
  }

  const stats = await getCachedEmbeddedAppStats(BOT_GUILDS.PROD_ENV);
  const instanceId = url.searchParams.get('instance_id');
  const initialGameName = instanceId
    ? getEmbeddedAppLaunchTarget(instanceId)
    : null;

  return initialGameName ? { ...stats, initialGameName } : stats;
};

export const fetchEmbeddedApp = createEmbeddedAppWorkerFetcher(
  loadEmbeddedAppStatsForRequest,
);
