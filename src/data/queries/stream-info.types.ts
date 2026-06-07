import type {
  MusicMode,
  ScheduleStatus,
  StreamKind,
  Weekday,
} from '../../generated/prisma/client';

export type DefaultStreamScheduleRule = {
  weekday: Weekday;
  startTime: string;
  durationMinutes: number;
  isEnabled: boolean;
};

export type TargetStreamOverrideInput = {
  guildId: string;
  streamDateKey: string;
  resolvedFromWeekday: Weekday | null;
  startAtUtc: Date;
  status?: ScheduleStatus;
  streamKind?: StreamKind | null;
  musicMode?: MusicMode | null;
  titleOverride?: string | null;
  gameName?: string | null;
  createGameName?: string | null;
};

export type EnsureGuildStreamConfigInput = {
  guildId: string;
  defaultConfig: {
    canonicalTimezone: string;
    currentWindowMinutes: number;
    lookaheadDays: number;
    defaultStreamKind: StreamKind;
  };
  defaultSchedule: readonly DefaultStreamScheduleRule[];
  startTimeToMinutes: (startTime: string) => number;
};

export type UpsertStreamScheduleDefaultForRuleInput = {
  guildId: string;
  rule: DefaultStreamScheduleRule;
  startTimeToMinutes: (startTime: string) => number;
};

export type FindStreamScheduleOverridesInDateRangeInput = {
  guildId: string;
  start: string;
  end: string;
};

export type UpsertStreamTitleResetOverrideInput = {
  guildId: string;
  streamDateKey: string;
  resolvedFromWeekday: Weekday | null;
  startAtUtc: Date;
};
