import type { Client } from 'discord.js';
import { runBossTrialLifecycleTick } from './boss-trial.lifecycle';

const BOSS_TRIAL_LIFECYCLE_INTERVAL_MS = 60_000;

let interval: NodeJS.Timeout | undefined;
let activeTick: Promise<void> | undefined;

const runScheduledTick = async (client: Client) => {
  if (activeTick) {
    return activeTick;
  }

  activeTick = runBossTrialLifecycleTick(client).finally(() => {
    activeTick = undefined;
  });

  return activeTick;
};

export const startBossTrialLifecycleScheduler = (client: Client) => {
  void runScheduledTick(client);

  if (interval) {
    return;
  }

  interval = setInterval(() => {
    void runScheduledTick(client);
  }, BOSS_TRIAL_LIFECYCLE_INTERVAL_MS);

  interval.unref();
};
