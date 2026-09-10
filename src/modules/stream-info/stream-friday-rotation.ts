import { DateTime } from 'luxon';
import {
  MusicMode,
  ScheduleStatus,
  StreamKind,
  type StreamScheduleOverride,
} from '../../generated/prisma/client';
import type { StreamOccurrence } from './stream-info.types';
import { resolveTitle } from './stream-info.utils';

export const FRIDAY_ROTATION_START_DATE_KEY = '2026-08-28';

const KNOWN_CONSUMED_DATE_KEYS = new Set(['2026-08-28', '2026-09-04']);

type FridayRotationEntry = {
  musicMode: MusicMode;
  musicTheme: string | null;
};

const PATREON_ROTATION = [
  {
    musicMode: MusicMode.PATREON_CAPITALISM,
    musicTheme: 'Patreon Gods & Oracles Tier',
  },
  {
    musicMode: MusicMode.PATREON_CAPITALISM,
    musicTheme: 'Patreon Masters Tier',
  },
] as const satisfies readonly FridayRotationEntry[];

const MONTHLY_ROTATION = [
  { musicMode: MusicMode.CAPITALISM, musicTheme: null },
  { musicMode: MusicMode.DEMOCRACY, musicTheme: null },
] as const satisfies readonly FridayRotationEntry[];

const isLastFridayOfMonth = (date: DateTime): boolean =>
  date.plus({ days: 7 }).month !== date.month;

const consumesRotationEntry = (
  override: StreamScheduleOverride | undefined,
  expected: FridayRotationEntry,
) => {
  if (!override) return true;
  if (override.status === ScheduleStatus.CANCELLED) return false;

  const streamKind = override.streamKind ?? StreamKind.MUSIC;
  const musicMode = override.musicMode ?? expected.musicMode;

  return streamKind === StreamKind.MUSIC && musicMode === expected.musicMode;
};

const getRotationEntry = (
  streamDateKey: string,
  overrides: ReadonlyMap<string, StreamScheduleOverride>,
): FridayRotationEntry | null => {
  const start = DateTime.fromISO(FRIDAY_ROTATION_START_DATE_KEY, {
    zone: 'America/Sao_Paulo',
  });
  const target = DateTime.fromISO(streamDateKey, {
    zone: 'America/Sao_Paulo',
  });
  if (target.toMillis() < start.toMillis()) return null;

  let patreonIndex = 0;
  let monthlyIndex = 0;
  let date = start;

  while (date.toMillis() <= target.toMillis()) {
    const dateKey = date.toFormat('yyyy-LL-dd');
    const monthly = isLastFridayOfMonth(date);
    const rotation = monthly ? MONTHLY_ROTATION : PATREON_ROTATION;
    const index = monthly ? monthlyIndex : patreonIndex;
    const expected = rotation[index % rotation.length];
    if (!expected) throw new Error('Friday stream rotation is empty.');
    if (dateKey === streamDateKey) return expected;

    const isKnownConsumedDate = KNOWN_CONSUMED_DATE_KEYS.has(dateKey);
    if (
      isKnownConsumedDate ||
      consumesRotationEntry(overrides.get(dateKey), expected)
    ) {
      if (monthly) monthlyIndex += 1;
      else patreonIndex += 1;
    }
    date = date.plus({ days: 7 });
  }

  return null;
};

export const applyFridayMusicRotation = (
  occurrence: StreamOccurrence,
  overrides: ReadonlyMap<string, StreamScheduleOverride>,
): StreamOccurrence => {
  if (occurrence.weekday !== 'FRIDAY') return occurrence;

  const entry = getRotationEntry(occurrence.dateKey, overrides);
  if (!entry) return occurrence;

  return {
    ...occurrence,
    streamKind: StreamKind.MUSIC,
    musicMode: entry.musicMode,
    title: resolveTitle(StreamKind.MUSIC, entry.musicMode, null),
    musicTheme: entry.musicTheme,
    gameName: null,
  };
};
