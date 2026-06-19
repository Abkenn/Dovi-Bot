import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
  type GuildConfig,
  MusicMode,
  ScheduleStatus,
  StreamKind,
  type StreamScheduleDefault,
  type StreamScheduleOverride,
} from '../../src/generated/prisma/client';
import {
  applyOverrideToOccurrence,
  buildDefaultOccurrence,
  extendOccurrenceCurrentWindow,
  findCurrentOccurrence,
  findNextOccurrence,
  isOngoingOccurrence,
  makeDateKey,
  resolveBaseGameName,
  resolveBaseMusicMode,
  resolveBaseStreamKind,
  resolveBaseTitle,
  resolveTargetStream,
  resolveTitle,
} from '../../src/modules/stream-info/stream-info.utils';
import { startTimeToMinutes } from '../../src/modules/stream-info/stream-schedule.config';

const now = new Date('2026-06-12T18:00:00.000Z');

const makeConfig = (overrides: Partial<GuildConfig> = {}): GuildConfig => ({
  guildId: 'guild-1',
  canonicalTimezone: 'America/Sao_Paulo',
  currentWindowMinutes: 240,
  lookaheadDays: 21,
  defaultStreamKind: StreamKind.GAME,
  defaultGameName: 'Default Game',
  defaultMusicMode: null,
  defaultTitleOverride: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const makeDefaultRule = (
  overrides: Partial<StreamScheduleDefault> = {},
): StreamScheduleDefault => ({
  id: 'default-1',
  guildId: 'guild-1',
  weekday: 'FRIDAY',
  startMinutes: startTimeToMinutes('15:10'),
  isEnabled: true,
  durationMinutes: 240,
  streamKind: null,
  musicMode: null,
  titleOverride: null,
  gameName: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const makeOverride = (
  overrides: Partial<StreamScheduleOverride> = {},
): StreamScheduleOverride => ({
  id: 'override-1',
  guildId: 'guild-1',
  streamDateKey: '2026-06-12',
  resolvedFromWeekday: 'FRIDAY',
  status: ScheduleStatus.SCHEDULED,
  startAtUtc: null,
  durationMinutes: null,
  streamKind: null,
  musicMode: null,
  titleOverride: null,
  gameName: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const friday = DateTime.fromISO('2026-06-12T00:00:00', {
  zone: 'America/Sao_Paulo',
});

describe('stream info utils', () => {
  it('parses schedule start times and rejects invalid values', () => {
    expect(startTimeToMinutes('15:10')).toBe(910);
    expect(startTimeToMinutes('3:05')).toBe(185);
    expect(() => startTimeToMinutes('nope')).toThrow(
      'Invalid stream schedule start time: nope',
    );
  });

  it('resolves stream titles from overrides, kind, and music mode', () => {
    expect(resolveTitle(StreamKind.GAME, null, 'Custom Title')).toBe(
      'Custom Title',
    );
    expect(resolveTitle(StreamKind.MUSIC, MusicMode.DEMOCRACY, null)).toBe(
      'Democracy Stream',
    );
    expect(resolveTitle(StreamKind.MUSIC, MusicMode.DICTATORSHIP, null)).toBe(
      'Dictatorship Stream',
    );
    expect(resolveTitle(StreamKind.MUSIC, MusicMode.CAPITALISM, null)).toBe(
      'Capitalism Stream',
    );
    expect(resolveTitle(StreamKind.MUSIC, MusicMode.UNKNOWN, null)).toBe(
      'Music Stream',
    );
    expect(resolveTitle(StreamKind.GAME, null, null)).toBe('Game Stream');
    expect(resolveTitle(StreamKind.OTHER, null, null)).toBe('Stream');
  });

  it('builds default occurrences from config and schedule rules', () => {
    const occurrence = buildDefaultOccurrence(
      makeConfig(),
      makeDefaultRule(),
      friday,
    );

    expect(occurrence).toMatchObject({
      dateKey: '2026-06-12',
      weekday: 'FRIDAY',
      streamKind: StreamKind.GAME,
      musicMode: null,
      title: 'Game Stream',
      gameName: 'Default Game',
      isOverride: false,
    });
    expect(occurrence.startAt.toISOString()).toBe('2026-06-12T18:10:00.000Z');
    expect(occurrence.endAt.toISOString()).toBe('2026-06-12T22:10:00.000Z');
  });

  it('extends scheduled current detection to 260 minutes from planned start', () => {
    const occurrence = buildDefaultOccurrence(
      makeConfig(),
      makeDefaultRule(),
      friday,
    );
    const extended = extendOccurrenceCurrentWindow(occurrence);

    expect(extended.startAt.toISOString()).toBe('2026-06-12T18:10:00.000Z');
    expect(extended.endAt.toISOString()).toBe('2026-06-12T22:30:00.000Z');
  });

  it('resolves base stream fields from rule values before config defaults', () => {
    const config = makeConfig({
      defaultStreamKind: StreamKind.GAME,
      defaultMusicMode: MusicMode.UNKNOWN,
      defaultTitleOverride: 'Default Title',
      defaultGameName: 'Default Game',
    });
    const rule = makeDefaultRule({
      streamKind: StreamKind.MUSIC,
      musicMode: MusicMode.DEMOCRACY,
      titleOverride: 'Rule Title',
      gameName: 'Rule Game',
    });

    expect(resolveBaseStreamKind(config, rule)).toBe(StreamKind.MUSIC);
    expect(resolveBaseMusicMode(config, rule)).toBe(MusicMode.DEMOCRACY);
    expect(
      resolveBaseTitle(config, rule, StreamKind.MUSIC, MusicMode.DEMOCRACY),
    ).toBe('Rule Title');
    expect(resolveBaseGameName(config, rule, StreamKind.MUSIC)).toBe(
      'Rule Game',
    );
    expect(
      resolveBaseGameName(config, makeDefaultRule(), StreamKind.GAME),
    ).toBe('Default Game');
  });

  it('applies scheduled overrides and keeps derived end time consistent', () => {
    const occurrence = buildDefaultOccurrence(
      makeConfig(),
      makeDefaultRule(),
      friday,
    );
    const overrideStart = new Date('2026-06-12T19:00:00.000Z');
    const updated = applyOverrideToOccurrence(
      makeConfig(),
      occurrence,
      makeOverride({
        startAtUtc: overrideStart,
        durationMinutes: 90,
        streamKind: StreamKind.MUSIC,
        musicMode: MusicMode.DEMOCRACY,
      }),
    );

    expect(updated).toMatchObject({
      startAt: overrideStart,
      streamKind: StreamKind.MUSIC,
      musicMode: MusicMode.DEMOCRACY,
      title: 'Democracy Stream',
      gameName: 'Default Game',
      isOverride: true,
    });
    expect(updated?.endAt.toISOString()).toBe('2026-06-12T20:30:00.000Z');
  });

  it('turns a music occurrence back into a game stream using the default game', () => {
    const occurrence = buildDefaultOccurrence(
      makeConfig(),
      makeDefaultRule({
        streamKind: StreamKind.MUSIC,
        musicMode: MusicMode.DEMOCRACY,
      }),
      friday,
    );
    const updated = applyOverrideToOccurrence(
      makeConfig({ defaultGameName: 'Fallback Game' }),
      occurrence,
      makeOverride({ streamKind: StreamKind.GAME }),
    );

    expect(updated).toMatchObject({
      streamKind: StreamKind.GAME,
      title: 'Game Stream',
      gameName: 'Fallback Game',
    });
  });

  it('removes cancelled overridden occurrences', () => {
    const occurrence = buildDefaultOccurrence(
      makeConfig(),
      makeDefaultRule(),
      friday,
    );

    expect(
      applyOverrideToOccurrence(
        makeConfig(),
        occurrence,
        makeOverride({ status: ScheduleStatus.CANCELLED }),
      ),
    ).toBeNull();
  });

  it('finds current and next occurrences and resolves target stream priority', () => {
    const first = {
      ...buildDefaultOccurrence(makeConfig(), makeDefaultRule(), friday),
      startAt: new Date('2026-06-12T18:00:00.000Z'),
      endAt: new Date('2026-06-12T20:00:00.000Z'),
    };
    const second = {
      ...first,
      dateKey: '2026-06-13',
      startAt: new Date('2026-06-13T18:00:00.000Z'),
      endAt: new Date('2026-06-13T20:00:00.000Z'),
    };
    const currentTime = DateTime.fromISO('2026-06-12T19:00:00Z');

    expect(makeDateKey(friday)).toBe('2026-06-12');
    expect(isOngoingOccurrence(first, currentTime)).toBe(true);
    expect(findCurrentOccurrence([first, second], currentTime)).toBe(first);
    expect(findNextOccurrence([first, second], currentTime)).toBe(second);
    expect(resolveTargetStream(first, second)).toEqual({
      target: 'current',
      occurrence: first,
    });
    expect(resolveTargetStream(null, second)).toEqual({
      target: 'next',
      occurrence: second,
    });
  });
});
