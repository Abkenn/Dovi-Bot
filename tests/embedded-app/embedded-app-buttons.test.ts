import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  launchEmbeddedAppStats: vi.fn(),
  createInteractionExecutionLog: vi.fn(),
}));

vi.mock('@sapphire/framework', () => ({
  Listener: class Listener {},
}));
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: {
    STAGING_ENV: 'staging-guild',
    PROD_ENV: 'production-guild',
  },
}));
vi.mock('../../src/modules/embedded-app/embedded-app-launch.service', () => ({
  launchEmbeddedAppStats: dependencies.launchEmbeddedAppStats,
}));
vi.mock('../../src/modules/command-logging/command-logging.service', () => ({
  createInteractionExecutionLog: dependencies.createInteractionExecutionLog,
}));

import { EmbeddedAppStatsButtonsListener } from '../../src/listeners/embedded-app-stats-buttons';

const makeInteraction = (customId: string, guildId = 'staging-guild') => ({
  isButton: () => true,
  customId,
  guildId,
  channelId: 'channel-1',
  user: { id: 'user-1', tag: 'DoviFan' },
  reply: vi.fn(),
});

describe('embedded app Stats buttons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('launches and logs the authenticated user and targeted game', async () => {
    const interaction = makeInteraction('embedded-app-stats:UNDERTALE');

    await EmbeddedAppStatsButtonsListener.prototype.run.call(
      {} as EmbeddedAppStatsButtonsListener,
      interaction as never,
    );

    expect(dependencies.launchEmbeddedAppStats).toHaveBeenCalledWith(
      interaction,
      'UNDERTALE',
    );
    expect(dependencies.createInteractionExecutionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction,
        commandName: 'stats-app:enter',
        optionsJson: {
          targetGame: 'UNDERTALE',
          customId: 'embedded-app-stats:UNDERTALE',
        },
        status: 'SUCCESS',
      }),
    );
  });

  it('ignores unrelated buttons', async () => {
    await EmbeddedAppStatsButtonsListener.prototype.run.call(
      {} as EmbeddedAppStatsButtonsListener,
      makeInteraction('another-button') as never,
    );

    expect(dependencies.launchEmbeddedAppStats).not.toHaveBeenCalled();
  });

  it('launches from production too', async () => {
    const interaction = makeInteraction(
      'embedded-app-stats',
      'production-guild',
    );

    await EmbeddedAppStatsButtonsListener.prototype.run.call(
      {} as EmbeddedAppStatsButtonsListener,
      interaction as never,
    );

    expect(dependencies.launchEmbeddedAppStats).toHaveBeenCalledOnce();
    expect(dependencies.createInteractionExecutionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        commandName: 'stats-app:enter',
        status: 'SUCCESS',
      }),
    );
  });

  it('logs unknown-guild clicks as denied', async () => {
    const interaction = makeInteraction('embedded-app-stats', 'unknown-guild');

    await EmbeddedAppStatsButtonsListener.prototype.run.call(
      {} as EmbeddedAppStatsButtonsListener,
      interaction as never,
    );

    expect(interaction.reply).toHaveBeenCalledOnce();
    expect(dependencies.createInteractionExecutionLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DENIED' }),
    );
  });
});
