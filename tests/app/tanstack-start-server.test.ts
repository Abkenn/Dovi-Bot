import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
  getCachedEmbeddedAppStats: vi.fn(),
  getEmbeddedAppLaunchTarget: vi.fn(),
}));

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: {
    STAGING_ENV: 'staging-guild',
    PROD_ENV: 'production-guild',
  },
}));
vi.mock(
  '../../src/modules/embedded-app/embedded-app-stats-cache.service',
  () => ({ getCachedEmbeddedAppStats: services.getCachedEmbeddedAppStats }),
);
vi.mock(
  '../../src/modules/embedded-app/embedded-app-launch-target.service',
  () => ({
    getEmbeddedAppLaunchTarget: services.getEmbeddedAppLaunchTarget,
  }),
);

import {
  createEmbeddedAppWorkerFetcher,
  loadEmbeddedAppStatsForRequest,
} from '../../src/app/tanstack-start-server';

const emptyStats = {
  game: null,
  currentBoss: null,
  currentStreamWindow: null,
  streamEncounters: [],
  killedBosses: [],
  games: [],
};

type WorkerMessage = {
  id: number;
  response?: {
    status: number;
    statusText: string;
    headers: [string, string][];
    body: ArrayBuffer;
  };
  error?: string;
};

const createFakeWorker = (
  reply: 'success' | 'error' | 'empty' | 'manual' = 'success',
) => {
  let messageListener: ((message: WorkerMessage) => void) | undefined;
  let errorListener: ((error: Error) => void) | undefined;
  let exitListener: ((code: number) => void) | undefined;
  const terminate = vi.fn(() => exitListener?.(1));
  const postMessage = vi.fn((message: { id: number }) => {
    if (reply === 'manual') {
      return;
    }
    if (reply === 'error') {
      messageListener?.({ id: message.id, error: 'SSR broke.' });
      return;
    }
    if (reply === 'empty') {
      messageListener?.({ id: message.id });
      return;
    }

    const body = new TextEncoder().encode('activity').buffer;
    messageListener?.({
      id: message.id,
      response: {
        status: 200,
        statusText: 'OK',
        headers: [['content-type', 'text/html']],
        body,
      },
    });
  });

  return {
    worker: {
      postMessage,
      onMessage: (listener: typeof messageListener) => {
        messageListener = listener;
      },
      onError: (listener: typeof errorListener) => {
        errorListener = listener;
      },
      onExit: (listener: typeof exitListener) => {
        exitListener = listener;
      },
      terminate,
    },
    postMessage,
    terminate,
    emitMessage: (message: WorkerMessage) => messageListener?.(message),
    emitError: (error: Error) => errorListener?.(error),
    emitExit: (code: number) => exitListener?.(code),
  };
};

describe('TanStack Start SSR worker integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds a short-lived Activity instance game target to the SSR payload', async () => {
    services.getCachedEmbeddedAppStats.mockResolvedValue(emptyStats);
    services.getEmbeddedAppLaunchTarget.mockReturnValue('UNDERTALE');

    await expect(
      loadEmbeddedAppStatsForRequest(
        new Request('https://dovi.test/?instance_id=instance-1'),
      ),
    ).resolves.toEqual({ ...emptyStats, initialGameName: 'UNDERTALE' });
    expect(services.getEmbeddedAppLaunchTarget).toHaveBeenCalledWith(
      'instance-1',
    );
  });

  it('leaves ordinary Activity SSR payloads unchanged', async () => {
    services.getCachedEmbeddedAppStats.mockResolvedValue(emptyStats);

    await expect(
      loadEmbeddedAppStatsForRequest(new Request('https://dovi.test/')),
    ).resolves.toBe(emptyStats);
    expect(services.getEmbeddedAppLaunchTarget).not.toHaveBeenCalled();
  });

  it('loads production stats for a production Activity launch', async () => {
    services.getCachedEmbeddedAppStats.mockResolvedValue(emptyStats);

    await loadEmbeddedAppStatsForRequest(
      new Request('https://dovi.test/?guild_id=production-guild'),
    );

    expect(services.getCachedEmbeddedAppStats).toHaveBeenCalledWith(
      'production-guild',
    );
  });

  it('rejects Activity launches from an unknown guild', async () => {
    await expect(
      loadEmbeddedAppStatsForRequest(
        new Request('https://dovi.test/?guild_id=unknown-guild'),
      ),
    ).rejects.toThrow('unsupported guild');
    expect(services.getCachedEmbeddedAppStats).not.toHaveBeenCalled();
  });

  it('renders requests in one isolated worker with cached stats', async () => {
    const fake = createFakeWorker();
    const createWorker = vi.fn(() => fake.worker);
    const loadStats = vi.fn().mockResolvedValue(emptyStats);
    const fetchActivity = createEmbeddedAppWorkerFetcher(
      loadStats,
      createWorker,
    );

    const first = await fetchActivity(new Request('https://dovi.test/'));
    const second = await fetchActivity(new Request('https://dovi.test/live'));

    expect(await first.text()).toBe('activity');
    expect(await second.text()).toBe('activity');
    expect(createWorker).toHaveBeenCalledOnce();
    expect(loadStats).toHaveBeenCalledTimes(2);
    expect(fake.postMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ stats: emptyStats }),
    );
  });

  it('recycles the worker before repeated SSR renders can retain heap', async () => {
    const workers = Array.from({ length: 2 }, createFakeWorker);
    const createWorker = vi
      .fn()
      .mockReturnValueOnce(workers[0]?.worker)
      .mockReturnValueOnce(workers[1]?.worker);
    const fetchActivity = createEmbeddedAppWorkerFetcher(
      vi.fn().mockResolvedValue(emptyStats),
      createWorker,
    );

    for (let render = 0; render < 26; render += 1) {
      await fetchActivity(new Request('https://dovi.test/'));
    }

    expect(workers[0]?.terminate).toHaveBeenCalledOnce();
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['error', 'SSR broke.'],
    ['empty', 'The embedded app SSR response is empty.'],
  ] as const)('rejects a worker %s response', async (reply, message) => {
    const fake = createFakeWorker(reply);
    const fetchActivity = createEmbeddedAppWorkerFetcher(
      vi.fn().mockResolvedValue(emptyStats),
      () => fake.worker,
    );

    await expect(
      fetchActivity(new Request('https://dovi.test/')),
    ).rejects.toThrow(message);
  });

  it('rejects pending renders when the worker fails', async () => {
    const fake = createFakeWorker('manual');
    const fetchActivity = createEmbeddedAppWorkerFetcher(
      vi.fn().mockResolvedValue(emptyStats),
      () => fake.worker,
    );
    const response = fetchActivity(
      new Request('https://dovi.test/action', {
        method: 'POST',
        body: 'payload',
      }),
    );
    const rejection = expect(response).rejects.toThrow('Worker crashed.');

    await vi.waitFor(() => expect(fake.postMessage).toHaveBeenCalledOnce());
    fake.emitError(new Error('Worker crashed.'));

    await rejection;
    expect(fake.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          method: 'POST',
          body: expect.any(ArrayBuffer),
        }),
      }),
    );
  });

  it('starts a fresh worker after a clean exit', async () => {
    const workers = Array.from({ length: 2 }, createFakeWorker);
    const createWorker = vi
      .fn()
      .mockReturnValueOnce(workers[0]?.worker)
      .mockReturnValueOnce(workers[1]?.worker);
    const fetchActivity = createEmbeddedAppWorkerFetcher(
      vi.fn().mockResolvedValue(emptyStats),
      createWorker,
    );

    await fetchActivity(new Request('https://dovi.test/'));
    workers[0]?.emitMessage({ id: 999 });
    workers[0]?.emitExit(0);
    await fetchActivity(new Request('https://dovi.test/'));

    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('rejects a pending render after an unexpected worker exit', async () => {
    const fake = createFakeWorker('manual');
    const fetchActivity = createEmbeddedAppWorkerFetcher(
      vi.fn().mockResolvedValue(emptyStats),
      () => fake.worker,
    );
    const response = fetchActivity(new Request('https://dovi.test/'));
    const rejection = expect(response).rejects.toThrow(
      'The embedded app SSR worker exited (2).',
    );

    await vi.waitFor(() => expect(fake.postMessage).toHaveBeenCalledOnce());
    fake.emitExit(2);

    await rejection;
  });
});
