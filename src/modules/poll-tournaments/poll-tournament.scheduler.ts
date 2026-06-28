import type { Client } from 'discord.js';
import { runPollTournamentLifecycleTick } from './poll-tournament.lifecycle';

const POLL_TOURNAMENT_INTERVAL_MS = 30_000;

let interval: NodeJS.Timeout | undefined;
let activeTick: Promise<void> | undefined;

const runScheduledTick = (client: Client) => {
  if (activeTick) {
    return activeTick;
  }

  activeTick = runPollTournamentLifecycleTick(client).finally(() => {
    activeTick = undefined;
  });

  return activeTick;
};

export const startPollTournamentScheduler = (client: Client) => {
  void runScheduledTick(client);

  if (interval) {
    return;
  }

  interval = setInterval(() => {
    void runScheduledTick(client);
  }, POLL_TOURNAMENT_INTERVAL_MS);
  interval.unref();
};
