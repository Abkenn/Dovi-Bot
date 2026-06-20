import { describe, expect, it, vi } from 'vitest';
import { removeDisabledProdPingMeCommand } from '../../src/modules/ping-me/ping-me-command-registration';

const prodCommand = {
  id: 'prod-command-id',
  name: 'ping-me',
};

describe('ping-me command registration cleanup', () => {
  it('deletes the stale prod guild command while prod registration is disabled', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Map([
        ['prod-command-id', prodCommand],
        ['other-command-id', { id: 'other-command-id', name: 'help' }],
      ]),
    );
    const deleteCommand = vi.fn().mockResolvedValue(prodCommand);

    await expect(
      removeDisabledProdPingMeCommand({
        fetch,
        deleteCommand,
        commandName: 'ping-me',
        prodGuildId: 'prod',
        prodRegistrationEnabled: false,
      }),
    ).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith({ guildId: 'prod' });
    expect(deleteCommand).toHaveBeenCalledWith('prod-command-id', 'prod');
  });

  it('does nothing when the stale command is already gone', async () => {
    const fetch = vi.fn().mockResolvedValue(new Map());
    const deleteCommand = vi.fn();

    await expect(
      removeDisabledProdPingMeCommand({
        fetch,
        deleteCommand,
        commandName: 'ping-me',
        prodGuildId: 'prod',
        prodRegistrationEnabled: false,
      }),
    ).resolves.toBe(false);
    expect(deleteCommand).not.toHaveBeenCalled();
  });

  it('does not delete the command after prod is explicitly re-enabled', async () => {
    const fetch = vi.fn();
    const deleteCommand = vi.fn();

    await expect(
      removeDisabledProdPingMeCommand({
        fetch,
        deleteCommand,
        commandName: 'ping-me',
        prodGuildId: 'prod',
        prodRegistrationEnabled: true,
      }),
    ).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(deleteCommand).not.toHaveBeenCalled();
  });
});
