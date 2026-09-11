import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getStreamInfo: vi.fn(),
  refreshTrackedStreamAnnouncement: vi.fn(),
  setDefaultGameName: vi.fn(),
}));

vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: dependencies.getStreamInfo,
  setDefaultGameName: dependencies.setDefaultGameName,
}));
vi.mock(
  '../../src/modules/stream-info/stream-announcement-change.service',
  () => ({
    refreshTrackedStreamAnnouncement:
      dependencies.refreshTrackedStreamAnnouncement,
  }),
);

import { setDefaultStreamGame } from '../../src/modules/stream-info/stream-default-game.service';

const occurrence = (
  dateKey: string,
  gameName: string | null,
  startAt: string,
  endAt: string,
) => ({
  dateKey,
  endAt: new Date(endAt),
  gameName,
  isCombined: false,
  isOverride: false,
  musicMode: null,
  musicTheme: null,
  startAt: new Date(startAt),
  streamKind: gameName ? 'GAME' : 'MUSIC',
  title: gameName ? 'Game Stream' : 'Music Stream',
  weekday: gameName ? 'SATURDAY' : 'FRIDAY',
});

const streamInfo = ({
  current = null,
  next = null,
  previous = null,
}: {
  current?: ReturnType<typeof occurrence> | null;
  next?: ReturnType<typeof occurrence> | null;
  previous?: ReturnType<typeof occurrence> | null;
}) => ({ current, next, previous, timezone: 'America/Sao_Paulo' });

describe('default stream game updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T22:00:00.000Z'));
    dependencies.setDefaultGameName.mockResolvedValue(undefined);
    dependencies.refreshTrackedStreamAnnouncement.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes the current Friday announcement when its next Saturday game changes', async () => {
    const friday = occurrence(
      '2026-09-11',
      null,
      '2026-09-11T18:10:00.000Z',
      '2026-09-11T22:10:00.000Z',
    );
    const oldSaturday = occurrence(
      '2026-09-12',
      'Onimusha: Way of the Sword',
      '2026-09-12T18:10:00.000Z',
      '2026-09-12T22:10:00.000Z',
    );
    const newSaturday = {
      ...oldSaturday,
      gameName: 'Ace Combat 7',
    };
    dependencies.getStreamInfo
      .mockResolvedValueOnce(streamInfo({ current: friday, next: oldSaturday }))
      .mockResolvedValueOnce(
        streamInfo({ current: friday, next: newSaturday }),
      );

    await setDefaultStreamGame({
      client: { id: 'client' } as never,
      gameName: 'Ace Combat 7',
      guildId: 'production-guild',
    });

    expect(dependencies.setDefaultGameName).toHaveBeenCalledWith(
      'production-guild',
      'Ace Combat 7',
    );
    expect(dependencies.refreshTrackedStreamAnnouncement).toHaveBeenCalledWith({
      client: { id: 'client' },
      guildId: 'production-guild',
      streamDateKey: '2026-09-11',
    });
  });

  it('refreshes Friday shortly after it ends when Saturday is still next', async () => {
    vi.setSystemTime(new Date('2026-09-11T23:00:00.000Z'));
    const friday = occurrence(
      '2026-09-11',
      null,
      '2026-09-11T18:10:00.000Z',
      '2026-09-11T22:10:00.000Z',
    );
    const oldSaturday = occurrence(
      '2026-09-12',
      'Onimusha: Way of the Sword',
      '2026-09-12T18:10:00.000Z',
      '2026-09-12T22:10:00.000Z',
    );
    const newSaturday = { ...oldSaturday, gameName: 'Ace Combat 7' };
    dependencies.getStreamInfo
      .mockResolvedValueOnce(
        streamInfo({ previous: friday, next: oldSaturday }),
      )
      .mockResolvedValueOnce(
        streamInfo({ previous: friday, next: newSaturday }),
      );

    await setDefaultStreamGame({
      client: { id: 'client' } as never,
      gameName: 'Ace Combat 7',
      guildId: 'production-guild',
    });

    expect(dependencies.refreshTrackedStreamAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ streamDateKey: '2026-09-11' }),
    );
  });

  it('does not refresh a historical announcement from last week', async () => {
    const previous = occurrence(
      '2026-09-05',
      'Old Game',
      '2026-09-05T18:10:00.000Z',
      '2026-09-05T22:10:00.000Z',
    );
    const oldNext = occurrence(
      '2026-09-18',
      'Onimusha: Way of the Sword',
      '2026-09-18T18:10:00.000Z',
      '2026-09-18T22:10:00.000Z',
    );
    const newNext = { ...oldNext, gameName: 'Ace Combat 7' };
    dependencies.getStreamInfo
      .mockResolvedValueOnce(streamInfo({ previous, next: oldNext }))
      .mockResolvedValueOnce(streamInfo({ previous, next: newNext }));

    await setDefaultStreamGame({
      client: { id: 'client' } as never,
      gameName: 'Ace Combat 7',
      guildId: 'production-guild',
    });

    expect(
      dependencies.refreshTrackedStreamAnnouncement,
    ).not.toHaveBeenCalled();
  });

  it('does not refresh when a dated game override keeps the display unchanged', async () => {
    const friday = occurrence(
      '2026-09-11',
      null,
      '2026-09-11T18:10:00.000Z',
      '2026-09-11T22:10:00.000Z',
    );
    const overriddenSaturday = {
      ...occurrence(
        '2026-09-12',
        'Onimusha: Way of the Sword',
        '2026-09-12T18:10:00.000Z',
        '2026-09-12T22:10:00.000Z',
      ),
      isOverride: true,
    };
    dependencies.getStreamInfo.mockResolvedValue(
      streamInfo({ current: friday, next: overriddenSaturday }),
    );

    await setDefaultStreamGame({
      client: { id: 'client' } as never,
      gameName: 'Ace Combat 7',
      guildId: 'production-guild',
    });

    expect(
      dependencies.refreshTrackedStreamAnnouncement,
    ).not.toHaveBeenCalled();
  });
});
