import type { ButtonInteraction } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { launchEmbeddedAppStats } from '../../src/modules/embedded-app/embedded-app-launch.service';

const makeInteraction = () => {
  const launchActivity = vi.fn();
  const reply = vi.fn();
  const interaction = { launchActivity, reply } as unknown as ButtonInteraction;

  return { interaction, launchActivity, reply };
};

describe('embedded app launch', () => {
  it('launches the configured Discord Activity', async () => {
    const { interaction, launchActivity, reply } = makeInteraction();
    launchActivity.mockResolvedValue(undefined);

    await launchEmbeddedAppStats(interaction);

    expect(launchActivity).toHaveBeenCalledOnce();
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

  it('ignores an expired interaction while explaining missing Activities', async () => {
    const { interaction, launchActivity, reply } = makeInteraction();
    launchActivity.mockRejectedValue({ code: 50234 });
    reply.mockRejectedValue({ code: 10062 });

    await expect(launchEmbeddedAppStats(interaction)).resolves.toBeUndefined();
  });
});
