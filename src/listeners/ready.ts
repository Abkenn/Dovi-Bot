import { Listener } from '@sapphire/framework';
import { startDaviBossStatsSyncScheduler } from '../modules/boss-stats/sync/davi-boss-stats-sync.scheduler';
import { startBossTrialLifecycleScheduler } from '../modules/boss-stats/trials/poll/boss-trial.scheduler';

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
    startDaviBossStatsSyncScheduler();
    startBossTrialLifecycleScheduler(this.container.client);
  }
}
