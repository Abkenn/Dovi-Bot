import { EventEmitter } from 'node:events';
import { Events } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sapphire/framework', () => ({
  Listener: class {
    public constructor(
      _context: unknown,
      public options: object,
    ) {}
  },
}));

const startup = vi.hoisted(() => ({
  startActivityTracking: vi.fn(),
  notifyDeploymentReady: vi.fn().mockResolvedValue(undefined),
  scheduler: vi.fn(),
}));
vi.mock('../../src/modules/embedded-app/activity-tracking.scheduler', () => ({
  startActivityTracking: startup.startActivityTracking,
}));
vi.mock('../../src/modules/command-runner/seasonal-message-effects', () => ({
  startSeasonalMessageEffectRecovery: startup.scheduler,
}));
vi.mock('../../src/app/deployment-notifications', () => ({
  notifyDeploymentReady: startup.notifyDeploymentReady,
}));
vi.mock('../../src/app/uptime-status-monitor', () => ({
  startHealthCheckMonitor: startup.scheduler,
  startUptimeStatusMonitor: startup.scheduler,
}));
vi.mock(
  '../../src/modules/boss-encounter-stats/sync/davi-boss-stats-sync.scheduler',
  () => ({ startDaviBossStatsSyncScheduler: startup.scheduler }),
);
vi.mock('../../src/modules/boss-trials/poll/boss-trial.scheduler', () => ({
  startBossTrialLifecycleScheduler: startup.scheduler,
}));
vi.mock('../../src/modules/poll-tournaments/poll-tournament.scheduler', () => ({
  startPollTournamentScheduler: startup.scheduler,
}));
vi.mock(
  '../../src/modules/stream-info/stream-info-message-updater.scheduler',
  () => ({ startStreamInfoMessageUpdater: startup.scheduler }),
);
vi.mock('../../src/modules/youtube-uploads/youtube-upload.scheduler', () => ({
  startYouTubeUploadScheduler: startup.scheduler,
}));

import { ReadyListener } from '../../src/listeners/ready';

describe('client ready startup', () => {
  beforeEach(() => vi.clearAllMocks());
  it('starts schedulers and Activity tracking once on the current Discord event', () => {
    const listener = new ReadyListener({} as never, {});
    expect(listener.options).toMatchObject({
      event: Events.ClientReady,
      once: true,
    });
    const client = new EventEmitter();
    Object.assign(client, { user: { tag: 'Dovi', setPresence: vi.fn() } });
    Object.assign(listener, {
      container: { client, logger: { info: vi.fn(), error: vi.fn() } },
    });
    client.once(Events.ClientReady, () => listener.run());
    client.emit(Events.ClientReady);
    client.emit(Events.ClientReady);
    expect(startup.startActivityTracking).toHaveBeenCalledExactlyOnceWith(
      client,
    );
    expect(startup.notifyDeploymentReady).toHaveBeenCalledExactlyOnceWith(
      client,
    );
    expect(startup.scheduler).toHaveBeenCalledTimes(8);
  });

  it('logs deployment notification failure without interrupting startup', async () => {
    const listener = new ReadyListener({} as never, {});
    const error = new Error('DM unavailable');
    startup.notifyDeploymentReady.mockRejectedValueOnce(error);
    const logger = { info: vi.fn(), error: vi.fn() };
    Object.assign(listener, { container: { client: { user: null }, logger } });
    listener.run();
    await Promise.resolve();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to send deployment DM.',
      error,
    );
    expect(startup.startActivityTracking).toHaveBeenCalledTimes(1);
  });
});
