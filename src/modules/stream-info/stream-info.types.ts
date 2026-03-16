import type {
  MusicMode,
  StreamKind,
  Weekday,
} from '../../generated/prisma/client';

export type StreamOccurrence = {
  dateKey: string;
  weekday: Weekday | null;
  startAt: Date;
  endAt: Date;
  streamKind: StreamKind;
  musicMode: MusicMode | null;
  title: string | null;
  gameName: string | null;
  isOverride: boolean;
};

export type StreamInfoResult = {
  timezone: string;
  current: StreamOccurrence | null;
  next: StreamOccurrence | null;
};

export type SetStreamInfoInput = {
  guildId: string;
  date?: string | null;
  time?: string | null;
  streamKind?: StreamKind | null;
  musicMode?: MusicMode | null;
  title?: string | null;
  gameName?: string | null;
};

export type TargetStream = 'current' | 'next';
