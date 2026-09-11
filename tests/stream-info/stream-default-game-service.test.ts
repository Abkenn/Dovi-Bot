import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  refreshRelevantTrackedStreamAnnouncements: vi.fn(),
  setDefaultGameName: vi.fn(),
}));

vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  setDefaultGameName: dependencies.setDefaultGameName,
}));
vi.mock(
  '../../src/modules/stream-info/stream-announcement-refresh.service',
  () => ({
    refreshRelevantTrackedStreamAnnouncements:
      dependencies.refreshRelevantTrackedStreamAnnouncements,
  }),
);

import { setDefaultStreamGame } from '../../src/modules/stream-info/stream-default-game.service';

describe('default stream game updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.setDefaultGameName.mockResolvedValue(undefined);
    dependencies.refreshRelevantTrackedStreamAnnouncements.mockResolvedValue(
      undefined,
    );
  });

  it('updates the default before reconciling relevant announcements', async () => {
    await setDefaultStreamGame({
      client: { id: 'client' } as never,
      gameName: 'Ace Combat 7',
      guildId: 'production-guild',
    });

    expect(dependencies.setDefaultGameName).toHaveBeenCalledWith(
      'production-guild',
      'Ace Combat 7',
    );
    expect(
      dependencies.refreshRelevantTrackedStreamAnnouncements,
    ).toHaveBeenCalledWith({
      client: { id: 'client' },
      guildId: 'production-guild',
    });
    expect(
      dependencies.setDefaultGameName.mock.invocationCallOrder[0],
    ).toBeLessThan(
      dependencies.refreshRelevantTrackedStreamAnnouncements.mock
        .invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });
});
