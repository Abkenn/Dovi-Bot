import { Listener } from '@sapphire/framework';
import { ActivityType } from 'discord.js';
import { notifyDeploymentReady } from '../app/deployment-notifications';
import {
  startHealthCheckMonitor,
  startUptimeStatusMonitor,
} from '../app/uptime-status-monitor';
import { startDaviBossStatsSyncScheduler } from '../modules/boss-encounter-stats/sync/davi-boss-stats-sync.scheduler';
import { startBossTrialLifecycleScheduler } from '../modules/boss-trials/poll/boss-trial.scheduler';
import { startStreamInfoMessageUpdater } from '../modules/stream-info/stream-info-message-updater.scheduler';

export class ReadyListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: 'ready',
      once: true,
    });
  }

  public override run() {
    this.container.logger.info(
      `Logged in as ${this.container.client.user?.tag ?? 'unknown-user'}`,
    );

    this.container.client.user?.setPresence({
      activities: [
        {
          name: 'help status',
          state: '/help',
          type: ActivityType.Custom,
        },
      ],
    });

    startDaviBossStatsSyncScheduler();
    startBossTrialLifecycleScheduler(this.container.client);
    startStreamInfoMessageUpdater(this.container.client);
    startUptimeStatusMonitor(this.container.client);
    startHealthCheckMonitor(this.container.client);
    void notifyDeploymentReady(this.container.client).catch((error) => {
      this.container.logger.error('Failed to send deployment DM.', error);
    });
  }
}
