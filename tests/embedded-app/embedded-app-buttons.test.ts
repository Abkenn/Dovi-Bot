import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  launchEmbeddedAppStats: vi.fn(),
  replyWithEmbeddedAppStatsLink: vi.fn(),
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
vi.mock('../../src/types/zod-schemas/env.zod', () => ({
  env: { DISCORD_CLIENT_ID: 'app-1' },
}));
vi.mock('../../src/modules/embedded-app/embedded-app-launch.service', () => ({
  launchEmbeddedAppStats: dependencies.launchEmbeddedAppStats,
  replyWithEmbeddedAppStatsLink: dependencies.replyWithEmbeddedAppStatsLink,
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
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.launchEmbeddedAppStats.mockResolvedValue({
      launched: true,
      note: null,
    });
    dependencies.replyWithEmbeddedAppStatsLink.mockResolvedValue({
      launched: true,
      note: 'Used Activity deep link.',
    });
    dependencies.createInteractionExecutionLog.mockResolvedValue(undefined);
  });

  it('registers as an interaction listener', () => {
    expect(
      new EmbeddedAppStatsButtonsListener({} as never, {} as never),
    ).toBeInstanceOf(EmbeddedAppStatsButtonsListener);
  });

  it('ignores interactions that are not buttons', async () => {
    await EmbeddedAppStatsButtonsListener.prototype.run.call(
      {} as EmbeddedAppStatsButtonsListener,
      { isButton: () => false } as never,
    );

    expect(dependencies.launchEmbeddedAppStats).not.toHaveBeenCalled();
  });

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

  it('replies with a deep link for legacy production buttons', async () => {
    const interaction = makeInteraction(
      'embedded-app-stats',
      'production-guild',
    );

    await EmbeddedAppStatsButtonsListener.prototype.run.call(
      {} as EmbeddedAppStatsButtonsListener,
      interaction as never,
    );

    expect(dependencies.launchEmbeddedAppStats).not.toHaveBeenCalled();
    expect(dependencies.replyWithEmbeddedAppStatsLink).toHaveBeenCalledWith(
      interaction,
      null,
    );
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

  it('logs launch failures before preserving the error', async () => {
    const error = new Error('Discord unavailable');
    dependencies.launchEmbeddedAppStats.mockRejectedValue(error);

    await expect(
      EmbeddedAppStatsButtonsListener.prototype.run.call(
        {} as EmbeddedAppStatsButtonsListener,
        makeInteraction('embedded-app-stats') as never,
      ),
    ).rejects.toBe(error);
    expect(dependencies.createInteractionExecutionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERROR',
        note: 'Discord unavailable',
      }),
    );
  });

  it('logs an expired duplicate interaction without throwing', async () => {
    dependencies.launchEmbeddedAppStats.mockResolvedValue({
      launched: false,
      note: 'Interaction expired before the Activity launched.',
    });

    await expect(
      EmbeddedAppStatsButtonsListener.prototype.run.call(
        {} as EmbeddedAppStatsButtonsListener,
        makeInteraction('embedded-app-stats') as never,
      ),
    ).resolves.toBeUndefined();
    expect(dependencies.createInteractionExecutionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERROR',
        note: 'Interaction expired before the Activity launched.',
      }),
    );
  });

  it('does not fail a launch when analytics logging is unavailable', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    dependencies.createInteractionExecutionLog.mockRejectedValue(
      new Error('Database unavailable'),
    );

    await expect(
      EmbeddedAppStatsButtonsListener.prototype.run.call(
        {} as EmbeddedAppStatsButtonsListener,
        makeInteraction('embedded-app-stats') as never,
      ),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to log Stats app button interaction',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});
