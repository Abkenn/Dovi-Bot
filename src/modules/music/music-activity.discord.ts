import { randomUUID } from 'node:crypto';
import {
  expireComponentLifetime,
  registerComponentLifetime,
} from '../discord/component-lifecycle';
import {
  buildEmbeddedAppStatsButton,
  EMBEDDED_APP_STATS_CUSTOM_ID,
} from '../embedded-app/embedded-app-stats.discord';
import type { MusicSearchInput } from './music.types';
import { encodeMusicActivityTarget } from './music-activity-target';

const prefix = 'music-search:';
const lifetime = 60 * 60 * 1000;
const targets = new Map<string, { target: string; expiresAt: number }>();

export const buildMusicActivityButton = (
  guildId: string | null,
  state: MusicSearchInput,
) => {
  const id = `${prefix}${randomUUID()}`;
  const row = buildEmbeddedAppStatsButton(guildId ?? '', id);
  if (!row) return null;
  for (const [key, entry] of targets) {
    if (entry.expiresAt <= Date.now() || targets.size >= 1_000) {
      targets.delete(key);
      void expireComponentLifetime(`${EMBEDDED_APP_STATS_CUSTOM_ID}:${key}`);
    }
  }
  const expiresAt = Date.now() + lifetime;
  targets.set(id, { target: encodeMusicActivityTarget(state), expiresAt });
  registerComponentLifetime(`${EMBEDDED_APP_STATS_CUSTOM_ID}:${id}`, expiresAt);
  row.components[0]?.setLabel('Music Stats').setEmoji('🎵');
  return row;
};

export const resolveMusicActivityButtonTarget = (target: string | null) => {
  if (!target?.startsWith(prefix)) return target;
  const entry = targets.get(target);
  if (entry && entry.expiresAt > Date.now()) return entry.target;
  targets.delete(target);
  void expireComponentLifetime(`${EMBEDDED_APP_STATS_CUSTOM_ID}:${target}`);
  return null;
};
