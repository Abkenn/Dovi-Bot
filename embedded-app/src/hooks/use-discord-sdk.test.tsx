import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiscordSdk } from './use-discord-sdk';

const sdk = vi.hoisted(() => ({
  constructor: vi.fn(),
  ready: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@discord/embedded-app-sdk', () => ({
  DiscordSDK: class {
    public constructor(clientId: string) {
      sdk.constructor(clientId);
    }

    public ready = sdk.ready;
  },
}));

describe('useDiscordSdk', () => {
  beforeEach(() => vi.clearAllMocks());

  it('readies the SDK for the configured Discord application', () => {
    renderHook(() => useDiscordSdk('client-1'));

    expect(sdk.constructor).toHaveBeenCalledWith('client-1');
    expect(sdk.ready).toHaveBeenCalledOnce();
  });

  it('stays inert when the client id is unavailable', () => {
    renderHook(() => useDiscordSdk(''));

    expect(sdk.constructor).not.toHaveBeenCalled();
  });
});
