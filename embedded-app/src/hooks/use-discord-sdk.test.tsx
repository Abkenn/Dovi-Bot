import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiscordSdk } from './use-discord-sdk';

const sdk = vi.hoisted(() => ({
  constructor: vi.fn(),
  ready: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn(),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
  customId: null as string | null,
  platform: 'mobile',
}));

vi.mock('@discord/embedded-app-sdk', () => ({
  DiscordSDK: class {
    public constructor(clientId: string) {
      sdk.constructor(clientId);
    }

    public ready = sdk.ready;
    public subscribe = sdk.subscribe;
    public unsubscribe = sdk.unsubscribe;
    public customId = sdk.customId;
    public platform = sdk.platform;
  },
  Common: {
    LayoutModeTypeObject: { PIP: 1 },
    OrientationTypeObject: { PORTRAIT: 0 },
  },
}));

describe('useDiscordSdk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.customId = null;
    sdk.subscribe.mockResolvedValue(undefined);
    document.documentElement.removeAttribute('data-activity-layout');
    document.documentElement.removeAttribute('data-screen-orientation');
    document.documentElement.removeAttribute('data-discord-platform');
  });

  it('readies the SDK for the configured Discord application', () => {
    renderHook(() => useDiscordSdk('client-1'));

    expect(sdk.constructor).toHaveBeenCalledWith('client-1');
    expect(sdk.ready).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.discordPlatform).toBe('mobile');
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

  it('marks portrait picture-in-picture mode for mobile-specific layout', async () => {
    sdk.subscribe.mockImplementation(
      async (event: string, listener: (update: never) => void) => {
        if (event === 'ACTIVITY_LAYOUT_MODE_UPDATE') {
          listener({ layout_mode: 1 } as never);
        }
        if (event === 'ORIENTATION_UPDATE') {
          listener({ screen_orientation: 0 } as never);
        }
      },
    );

    renderHook(() => useDiscordSdk('client-1'));

    await waitFor(() => {
      expect(document.documentElement.dataset.activityLayout).toBe('pip');
      expect(document.documentElement.dataset.screenOrientation).toBe(
        'portrait',
      );
    });
  });

  it('marks non-PiP landscape mode and removes SDK subscriptions on cleanup', async () => {
    sdk.subscribe.mockImplementation(
      async (event: string, listener: (update: never) => void) => {
        if (event === 'ACTIVITY_LAYOUT_MODE_UPDATE') {
          listener({ layout_mode: 0 } as never);
        }
        if (event === 'ORIENTATION_UPDATE') {
          listener({ screen_orientation: 1 } as never);
        }
      },
    );

    const { unmount } = renderHook(() => useDiscordSdk('client-1'));

    await waitFor(() => {
      expect(document.documentElement.dataset.activityLayout).toBe('focused');
      expect(document.documentElement.dataset.screenOrientation).toBe(
        'landscape',
      );
    });

    unmount();

    expect(sdk.unsubscribe).toHaveBeenCalledTimes(2);
    expect(document.documentElement).not.toHaveAttribute(
      'data-activity-layout',
    );
    expect(document.documentElement).not.toHaveAttribute(
      'data-screen-orientation',
    );
  });
});
