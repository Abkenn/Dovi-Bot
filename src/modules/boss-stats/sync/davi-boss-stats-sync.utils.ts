import { Duration } from 'luxon';
import { z } from 'zod';
import type {
  DaviBossStatsSpreadsheetRow,
  DaviBossStatsSyncResult,
  ParsedDaviBossStatsRow,
} from './davi-boss-stats-sync.types';

export const createEmptyDaviBossStatsSyncResult =
  (): DaviBossStatsSyncResult => ({
    rowsRead: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    invalidRows: [],
  });

export const formatDaviBossStatsSyncSummary = (
  result: DaviBossStatsSyncResult,
) =>
  `Davi boss stats sync finished: ${result.rowsRead} rows read, ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed.`;

const nonNegativeNumberSchema = z.coerce.number().nonnegative();

const nonNegativeIntegerSchema = nonNegativeNumberSchema.int();

const parseNumberPart = (value: string) =>
  nonNegativeNumberSchema.parse(value.trim());

const parseOptionalInteger = (value: string) => {
  if (!value) {
    return null;
  }

  const normalized = value.split(',').join('').trim();

  try {
    return nonNegativeIntegerSchema.parse(normalized);
  } catch {
    throw new Error(`Expected a whole number, received "${value}".`);
  }
};

const getDurationParts = (value: string) => {
  if (value.includes(':')) {
    return value.split(':');
  }

  if (value.includes('.')) {
    return value.split('.');
  }

  return [value];
};

const parseOptionalDurationSeconds = (value: string) => {
  if (!value) {
    return null;
  }

  const parts = getDurationParts(value.trim()).map((part) => part.trim());

  if (parts.length === 1) {
    try {
      const minutes = parseNumberPart(parts[0] ?? '');
      return Math.round(Duration.fromObject({ minutes }).as('seconds'));
    } catch {
      throw new Error(`Expected duration minutes, received "${value}".`);
    }
  }

  if (parts.length < 2 || parts.length > 3) {
    throw new Error(
      `Expected duration as MM:SS, HH:MM:SS, MM.SS, or HH.MM.SS, received "${value}".`,
    );
  }

  const [hours, minutes, seconds] =
    parts.length === 3 ? parts : ['0', parts[0], parts[1]];

  try {
    const duration = Duration.fromObject({
      hours: parseNumberPart(hours ?? ''),
      minutes: parseNumberPart(minutes ?? ''),
      seconds: parseNumberPart(seconds ?? ''),
    });

    return Math.round(duration.as('seconds'));
  } catch {
    throw new Error(
      `Expected duration as MM:SS, HH:MM:SS, MM.SS, or HH.MM.SS, received "${value}".`,
    );
  }
};

const parseOptionalDecimal = (value: string) => {
  if (!value) {
    return null;
  }

  const normalized = value.split(',').join('.').trim();

  try {
    nonNegativeNumberSchema.parse(normalized);
  } catch {
    throw new Error(`Expected a decimal number, received "${value}".`);
  }

  return normalized;
};

export const parseDaviBossStatsRow = (
  row: DaviBossStatsSpreadsheetRow,
): ParsedDaviBossStatsRow => ({
  deaths: parseOptionalInteger(row.deaths),
  totalAttemptTimeSeconds: parseOptionalDurationSeconds(row.totalAttemptTime),
  winningAttemptTimeSeconds: parseOptionalDurationSeconds(
    row.winningAttemptTime,
  ),
  difficultyCoefficient: parseOptionalDecimal(row.difficultyCoefficient),
});
