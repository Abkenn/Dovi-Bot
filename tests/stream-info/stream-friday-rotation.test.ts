import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
  MusicMode,
  ScheduleStatus,
  StreamKind,
  type StreamScheduleOverride,
} from '../../src/generated/prisma/client';
import { applyFridayMusicRotation } from '../../src/modules/stream-info/stream-friday-rotation';
import type { StreamOccurrence } from '../../src/modules/stream-info/stream-info.types';
import { getDefaultStreamKindForDay } from '../../src/modules/stream-info/stream-schedule.config';

const makeFriday = (dateKey: string): StreamOccurrence => {
  const start = DateTime.fromISO(`${dateKey}T15:10:00`, {
    zone: 'America/Sao_Paulo',
  });

  return {
    dateKey,
    weekday: 'FRIDAY',
    startAt: start.toUTC().toJSDate(),
    endAt: start.plus({ hours: 4 }).toUTC().toJSDate(),
    streamKind: StreamKind.GAME,
    musicMode: null,
    title: 'Game Stream',
    customTitle: null,
    musicTheme: null,
    gameName: 'Default Game',
    isOverride: false,
  };
};

const makeOverride = (
  dateKey: string,
  fields: Partial<StreamScheduleOverride>,
): StreamScheduleOverride => ({
  id: `override-${dateKey}`,
  guildId: 'guild-1',
  streamDateKey: dateKey,
  resolvedFromWeekday: 'FRIDAY',
  status: ScheduleStatus.SCHEDULED,
  startAtUtc: makeFriday(dateKey).startAt,
  durationMinutes: null,
  streamKind: null,
  musicMode: null,
  musicTheme: null,
  titleOverride: null,
  gameName: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  ...fields,
});

const resolve = (
  dateKey: string,
  overrideRows: StreamScheduleOverride[] = [],
) =>
  applyFridayMusicRotation(
    makeFriday(dateKey),
    new Map(overrideRows.map((row) => [row.streamDateKey, row])),
  );

describe('Friday stream rotation', () => {
  it('defines music as the Friday default and game as the Saturday default', () => {
    expect(getDefaultStreamKindForDay('FRIDAY')).toBe(StreamKind.MUSIC);
    expect(getDefaultStreamKindForDay('SATURDAY')).toBe(StreamKind.GAME);
  });

  it('alternates Patreon tiers on ordinary Fridays from the September baseline', () => {
    expect(resolve('2026-09-04')).toMatchObject({
      streamKind: StreamKind.MUSIC,
      musicMode: MusicMode.PATREON_CAPITALISM,
      musicTheme: 'Patreon Gods & Oracles Tier',
    });
    expect(resolve('2026-09-11')).toMatchObject({
      musicMode: MusicMode.PATREON_CAPITALISM,
      musicTheme: 'Patreon Masters Tier',
    });
    expect(resolve('2026-09-18')).toMatchObject({
      musicTheme: 'Patreon Gods & Oracles Tier',
    });
  });

  it('alternates last-Friday Capitalism and Democracy from the August baseline', () => {
    expect(resolve('2026-08-28')).toMatchObject({
      musicMode: MusicMode.CAPITALISM,
      musicTheme: null,
    });
    expect(resolve('2026-09-25')).toMatchObject({
      musicMode: MusicMode.DEMOCRACY,
      musicTheme: null,
    });
    expect(resolve('2026-10-30')).toMatchObject({
      musicMode: MusicMode.CAPITALISM,
      musicTheme: null,
    });
  });

  it('keeps the known launch baselines consumed despite stale historical overrides', () => {
    const staleAugustOverride = makeOverride('2026-08-28', {
      musicMode: MusicMode.UNKNOWN,
    });
    const staleSeptemberOverride = makeOverride('2026-09-04', {
      streamKind: StreamKind.GAME,
    });

    expect(
      resolve('2026-09-11', [staleAugustOverride, staleSeptemberOverride]),
    ).toMatchObject({ musicTheme: 'Patreon Masters Tier' });
    expect(
      resolve('2026-09-25', [staleAugustOverride, staleSeptemberOverride]),
    ).toMatchObject({ musicMode: MusicMode.DEMOCRACY });
  });

  it('moves a replaced Patreon tier to the next ordinary Friday', () => {
    const gameFriday = makeOverride('2026-09-11', {
      streamKind: StreamKind.GAME,
    });

    expect(resolve('2026-09-18', [gameFriday])).toMatchObject({
      musicMode: MusicMode.PATREON_CAPITALISM,
      musicTheme: 'Patreon Masters Tier',
    });
  });

  it('keeps the monthly mode pending through repeated Dictatorship substitutions', () => {
    const septemberDictatorship = makeOverride('2026-09-25', {
      streamKind: StreamKind.MUSIC,
      musicMode: MusicMode.DICTATORSHIP,
    });
    const octoberDictatorship = makeOverride('2026-10-30', {
      streamKind: StreamKind.MUSIC,
      musicMode: MusicMode.DICTATORSHIP,
    });

    expect(resolve('2026-10-30', [septemberDictatorship])).toMatchObject({
      musicMode: MusicMode.DEMOCRACY,
    });
    expect(
      resolve('2026-11-27', [septemberDictatorship, octoberDictatorship]),
    ).toMatchObject({ musicMode: MusicMode.DEMOCRACY });
  });

  it('does not consume a rotation entry when its Friday is skipped', () => {
    const skippedFriday = makeOverride('2026-09-11', {
      status: ScheduleStatus.CANCELLED,
    });

    expect(resolve('2026-09-18', [skippedFriday])).toMatchObject({
      musicTheme: 'Patreon Masters Tier',
    });
  });
});
