import { readFile } from 'node:fs/promises';
import { type Client, Events } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { STAGING_ENV: 'staging', PROD_ENV: 'prod' },
}));
vi.mock('../../src/modules/command-runner/seasonal-theme.service', () => ({
  getBotThemeMode: vi.fn(async () => 'halloween'),
}));

import { SEASONAL_THEMES } from '../../src/config/seasonal-themes';
import {
  getSeasonalAvatarWindow,
  startSeasonalAvatarScheduler,
} from '../../src/modules/command-runner/seasonal-avatar.scheduler';
import { getBotThemeMode } from '../../src/modules/command-runner/seasonal-theme.service';

describe('seasonal guild avatar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getBotThemeMode).mockResolvedValue('halloween');
  });
  afterEach(() => {
    delete SEASONAL_THEMES.testEvent;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('has one stable 15-minute window inside each hour', () => {
    const starts = new Set<number>();
    for (let hour = 0; hour < 100; hour++) {
      const now = hour * 3_600_000;
      const window = getSeasonalAvatarWindow('staging', now, 900_000);
      expect(window.start).toBeGreaterThanOrEqual(now);
      expect(window.end).toBeLessThanOrEqual(now + 3_600_000);
      expect(window.end - window.start).toBe(900_000);
      expect(
        getSeasonalAvatarWindow('staging', now + 3_599_999, 900_000),
      ).toEqual(window);
      starts.add(window.start - now);
    }
    expect(starts.size).toBeGreaterThan(90);
    expect(SEASONAL_THEMES.halloween?.avatar?.environments).toEqual([
      'STAGING_ENV',
      'PROD_ENV',
    ]);
  });

  it('changes staging and prod, skips duplicate updates, and restores when disabled', async () => {
    const now = Date.UTC(2026, 9, 11, 12);
    const window = getSeasonalAvatarWindow('staging', now, 900_000);
    vi.setSystemTime(window.start + 1000);
    const editMe = vi.fn(
      async (_options: { avatar: Buffer | null; reason: string }) => ({}),
    );
    const fetchMe = vi.fn(async () => ({ avatar: null }));
    const fetch = vi.fn(async () => ({ members: { editMe, fetchMe } }));
    const once = vi.fn();
    startSeasonalAvatarScheduler({
      guilds: { fetch },
      once,
    } as unknown as Client);
    await vi.waitFor(() => expect(editMe).toHaveBeenCalledTimes(2));
    expect(fetch).toHaveBeenCalledWith('staging');
    expect(fetch).toHaveBeenCalledWith('prod');
    expect(editMe.mock.calls[0]).toEqual([
      {
        avatar: expect.any(Buffer),
        reason: 'Seasonal avatar schedule',
      },
    ]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(editMe).toHaveBeenCalledTimes(2);
    vi.mocked(getBotThemeMode).mockResolvedValue('normal');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(editMe).toHaveBeenLastCalledWith({
      avatar: null,
      reason: 'Seasonal avatar schedule',
    });
    expect(once).toHaveBeenCalledWith(Events.Invalidated, expect.any(Function));
    once.mock.calls[0]?.[1]();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(editMe).toHaveBeenCalledTimes(4);
  });

  it('restores the regular glitch GIF after restarting outside its ghost window', async () => {
    const now = Date.UTC(2026, 9, 11, 12);
    const window = getSeasonalAvatarWindow('staging', now, 900_000);
    vi.setSystemTime(window.end);
    const editMe = vi.fn(
      async (_options: { avatar: Buffer | null; reason: string }) => ({}),
    );
    const fetch = vi.fn(async () => ({
      members: { editMe, fetchMe: async () => ({ avatar: 'old-ghost' }) },
    }));
    startSeasonalAvatarScheduler({
      guilds: { fetch },
      once: vi.fn(),
    } as unknown as Client);
    await vi.waitFor(() => expect(editMe).toHaveBeenCalledTimes(2));
    const expectedGif = await readFile(
      new URL(
        '../../assets/seasonal/halloween-glitch-avatar.gif',
        import.meta.url,
      ),
    );
    const uploaded = editMe.mock.calls[0]?.[0].avatar;
    expect(Buffer.isBuffer(uploaded) && uploaded.equals(expectedGif)).toBe(
      true,
    );
    vi.clearAllTimers();
  });

  it('supports another event asset throughout the event and restores on theme changes', async () => {
    const halloween = SEASONAL_THEMES.halloween;
    if (!halloween) throw new Error('Missing Halloween fixture');
    SEASONAL_THEMES.testEvent = {
      ...halloween,
      id: 'testEvent',
      avatar: {
        environments: ['STAGING_ENV'],
        schedule: { mode: 'continuous' },
        image: new URL('../../package.json', import.meta.url),
      },
    };
    vi.mocked(getBotThemeMode).mockResolvedValue('testEvent');
    vi.setSystemTime(Date.UTC(2026, 9, 11, 12));
    const editMe = vi.fn(
      async (_options: { avatar: Buffer | null; reason: string }) => ({}),
    );
    const fetch = vi.fn(async () => ({
      members: { editMe, fetchMe: async () => ({ avatar: null }) },
    }));
    startSeasonalAvatarScheduler({
      guilds: { fetch },
      once: vi.fn(),
    } as unknown as Client);
    await vi.waitFor(() => expect(editMe).toHaveBeenCalledTimes(1));
    expect(editMe).toHaveBeenCalledWith({
      avatar: expect.any(Buffer),
      reason: 'Seasonal avatar schedule',
    });
    vi.mocked(getBotThemeMode).mockResolvedValue('normal');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(editMe).toHaveBeenLastCalledWith({
      avatar: null,
      reason: 'Seasonal avatar schedule',
    });
  });

  it('supports different intervals and rejects windows that cannot fit', () => {
    const window = getSeasonalAvatarWindow(
      'staging',
      7_200_000,
      600_000,
      7_200_000,
    );
    expect(window.start).toBeGreaterThanOrEqual(7_200_000);
    expect(window.end).toBeLessThanOrEqual(14_400_000);
    expect(window.end - window.start).toBe(600_000);
    expect(() => getSeasonalAvatarWindow('staging', 0, 61, 60)).toThrow(
      'fit its interval',
    );
    expect(() => getSeasonalAvatarWindow('staging', 0, 0, 60)).toThrow();
  });
});
