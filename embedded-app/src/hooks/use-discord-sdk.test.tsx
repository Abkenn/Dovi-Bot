import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiscordSdk } from './use-discord-sdk';

const sdk = vi.hoisted(() => ({
  constructor: vi.fn(),
  ready: vi.fn().mockResolvedValue(undefined),
  customId: null as string | null,
}));

vi.mock('@discord/embedded-app-sdk', () => ({
  DiscordSDK: class {
    public constructor(clientId: string) {
      sdk.constructor(clientId);
    }

    public ready = sdk.ready;
    public customId = sdk.customId;
  },
}));

describe('useDiscordSdk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.customId = null;
  });

  it('readies the SDK for the configured Discord application', () => {
    renderHook(() => useDiscordSdk('client-1'));

    expect(sdk.constructor).toHaveBeenCalledWith('client-1');
    expect(sdk.ready).toHaveBeenCalledOnce();
  });

  it('stays inert when the client id is unavailable', () => {
    renderHook(() => useDiscordSdk(''));

    expect(sdk.constructor).not.toHaveBeenCalled();
  });

  it('exposes a game target from a Discord Activity deep link', async () => {
    sdk.customId = 'UNDERTALE';

    const { result } = renderHook(() => useDiscordSdk('client-1'));

    await waitFor(() => expect(result.current).toBe('UNDERTALE'));
  });
});
