import { z } from 'zod';
import type { MusicSearchInput } from './music.types';

export const MUSIC_ACTIVITY_OVERVIEW_TARGET = 'music';

export const isMusicActivityTarget = (target: string | null | undefined) =>
  target === MUSIC_ACTIVITY_OVERVIEW_TARGET ||
  parseMusicActivityTarget(target) !== null;

export const musicActivitySearchSchema = z.object({
  query: z.string().trim().min(2).max(100),
  game: z.boolean(),
});

export const encodeMusicActivityTarget = (state: MusicSearchInput) => {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  const encoded = btoa(String.fromCharCode(...bytes))
    .split('+')
    .join('-')
    .split('/')
    .join('_')
    .split('=')
    .join('');
  return `music:${encoded}`;
};

export const parseMusicActivityTarget = (target: string | null | undefined) => {
  if (!target?.startsWith('music:')) return null;
  try {
    const parsed = musicActivitySearchSchema.safeParse(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          Uint8Array.from(
            atob(target.slice(6).split('-').join('+').split('_').join('/')),
            (character) => character.charCodeAt(0),
          ),
        ),
      ),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
