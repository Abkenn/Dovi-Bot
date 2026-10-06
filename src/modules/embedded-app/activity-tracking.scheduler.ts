import { type Client, Events } from 'discord.js';
import { refreshActivityInstances } from './activity-tracking.service';

let interval: NodeJS.Timeout | undefined;

export const startActivityTracking = (client: Client) => {
  if (interval) return;
  interval = setInterval(() => {
    const application = client.application;
    if (!application) return;
    void refreshActivityInstances((id) =>
      application.fetchActivityInstance(id),
    );
  }, 60_000);
  interval.unref();
  client.once(Events.Invalidated, () => {
    clearInterval(interval);
    interval = undefined;
  });
};
