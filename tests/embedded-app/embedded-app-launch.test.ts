import type { ButtonInteraction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const launchTargets = vi.hoisted(() => ({
  registerEmbeddedAppLaunchTarget: vi.fn(),
}));

vi.mock(
  '../../src/modules/embedded-app/embedded-app-launch-target.service',
  () => ({
    registerEmbeddedAppLaunchTarget:
      launchTargets.registerEmbeddedAppLaunchTarget,
  }),
);

import { launchEmbeddedAppStats } from '../../src/modules/embedded-app/embedded-app-launch.service';

const makeInteraction = () => {
  const launchActivity = vi.fn();
  const reply = vi.fn();
  const interaction = {
    applicationId: 'app-1',
    launchActivity,
    reply,
  } as unknown as ButtonInteraction;

  return { interaction, launchActivity, reply };
};

describe('embedded app launch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('launches the configured Discord Activity and binds its game target', async () => {
    const { interaction, launchActivity, reply } = makeInteraction();
    launchActivity.mockResolvedValue({
      interaction: { activityInstanceId: 'instance-1' },
    });

    await launchEmbeddedAppStats(interaction, 'UNDERTALE');

    expect(launchActivity).toHaveBeenCalledWith({ withResponse: true });
    expect(launchTargets.registerEmbeddedAppLaunchTarget).toHaveBeenCalledWith(
      'instance-1',
      'UNDERTALE',
    );
    expect(reply).not.toHaveBeenCalled();
  });

  it('explains when Activities are not enabled for the application', async () => {
    const { interaction, launchActivity, reply } = makeInteraction();
    launchActivity.mockRejectedValue({ code: 50234 });
    reply.mockResolvedValue(undefined);

    await launchEmbeddedAppStats(interaction);

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content:
          'Live Stats needs Activities enabled in the Discord Developer Portal.',
      }),
    );
  });

  it('does not hide unrelated Discord errors', async () => {
    const { interaction, launchActivity } = makeInteraction();
    launchActivity.mockRejectedValue(new Error('Discord unavailable'));

    await expect(launchEmbeddedAppStats(interaction)).rejects.toThrow(
      'Discord unavailable',
    );
  });

  it('offers a deep link when Discord cannot launch in the channel type', async () => {
    const { interaction, launchActivity, reply } = makeInteraction();
    launchActivity.mockRejectedValue({ code: 50024 });
    reply.mockResolvedValue(undefined);

    await launchEmbeddedAppStats(interaction, 'Elden Ring');

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Open Live Stats in Discord:',
        components: [
          expect.objectContaining({
            components: [
              expect.objectContaining({
                data: expect.objectContaining({
                  label: 'Stats',
                  url: 'https://discord.com/activities/app-1?custom_id=Elden+Ring',
                }),
              }),
            ],
          }),
        ],
      }),
    );
  });

  it('ignores an expired interaction while explaining missing Activities', async () => {
    const { interaction, launchActivity, reply } = makeInteraction();
    launchActivity.mockRejectedValue({ code: 50234 });
    reply.mockRejectedValue({ code: 10062 });

    await expect(launchEmbeddedAppStats(interaction)).resolves.toBeUndefined();
  });
});
