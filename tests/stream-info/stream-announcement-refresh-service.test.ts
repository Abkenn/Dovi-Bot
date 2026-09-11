import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getStreamInfo: vi.fn(),
  refreshTrackedStreamAnnouncement: vi.fn(),
}));

vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: dependencies.getStreamInfo,
}));
vi.mock(
  '../../src/modules/stream-info/stream-announcement-change.service',
  () => ({
    refreshTrackedStreamAnnouncement:
      dependencies.refreshTrackedStreamAnnouncement,
  }),
);

import { refreshRelevantTrackedStreamAnnouncements } from '../../src/modules/stream-info/stream-announcement-refresh.service';

const occurrence = (dateKey: string) => ({ dateKey });

describe('relevant stream announcement refreshes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.refreshTrackedStreamAnnouncement.mockResolvedValue(true);
  });

  it('refreshes the current and next stream announcements', async () => {
    dependencies.getStreamInfo.mockResolvedValue({
      current: occurrence('2026-09-11'),
      next: occurrence('2026-09-12'),
      previous: occurrence('2026-09-05'),
    });

    await refreshRelevantTrackedStreamAnnouncements({
      client: { id: 'client' } as never,
      guildId: 'production-guild',
    });

    expect(dependencies.refreshTrackedStreamAnnouncement).toHaveBeenCalledTimes(
      2,
    );
    expect(dependencies.refreshTrackedStreamAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ streamDateKey: '2026-09-11' }),
    );
    expect(dependencies.refreshTrackedStreamAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ streamDateKey: '2026-09-12' }),
    );
    expect(
      dependencies.refreshTrackedStreamAnnouncement,
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({ streamDateKey: '2026-09-05' }),
    );
  });

  it('refreshes the latest completed announcement and current next stream without a time limit', async () => {
    dependencies.getStreamInfo.mockResolvedValue({
      current: null,
      next: occurrence('2026-09-18'),
      previous: occurrence('2026-09-12'),
    });

    await refreshRelevantTrackedStreamAnnouncements({
      client: { id: 'client' } as never,
      guildId: 'production-guild',
    });

    expect(dependencies.refreshTrackedStreamAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ streamDateKey: '2026-09-12' }),
    );
    expect(dependencies.refreshTrackedStreamAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ streamDateKey: '2026-09-18' }),
    );
  });

  it('also refreshes an explicitly edited occurrence without duplicate edits', async () => {
    dependencies.getStreamInfo.mockResolvedValue({
      current: null,
      next: occurrence('2026-09-18'),
      previous: occurrence('2026-09-12'),
    });

    await refreshRelevantTrackedStreamAnnouncements({
      additionalStreamDateKey: '2026-09-18',
      client: { id: 'client' } as never,
      guildId: 'production-guild',
    });

    expect(dependencies.refreshTrackedStreamAnnouncement).toHaveBeenCalledTimes(
      2,
    );
  });

  it('does nothing when the schedule has no relevant occurrence', async () => {
    dependencies.getStreamInfo.mockResolvedValue({
      current: null,
      next: null,
      previous: null,
    });

    await refreshRelevantTrackedStreamAnnouncements({
      client: { id: 'client' } as never,
      guildId: 'production-guild',
    });

    expect(
      dependencies.refreshTrackedStreamAnnouncement,
    ).not.toHaveBeenCalled();
  });
});
