import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { type Client, Events } from 'discord.js';
import { BOT_GUILDS } from '../../config/discord-access';
import {
  getSeasonalTheme,
  SEASONAL_THEMES,
} from '../../config/seasonal-themes';
import { getBotThemeMode } from './seasonal-theme.service';

const HOUR_MS = 60 * 60_000;

// Stable randomness keeps this hour's window unchanged after a restart.
export const getSeasonalAvatarWindow = (
  guildId: string,
  now: number,
  durationMs: number,
  intervalMs = HOUR_MS,
) => {
  if (
    !Number.isSafeInteger(intervalMs) ||
    !Number.isSafeInteger(durationMs) ||
    intervalMs <= 0 ||
    durationMs <= 0 ||
    durationMs > intervalMs
  ) {
    throw new Error(
      'Avatar window duration must be positive and fit its interval.',
    );
  }
  const hour = Math.floor(now / intervalMs);
  const seed = createHash('sha256')
    .update(`seasonal-avatar:${guildId}:${hour}`)
    .digest()
    .readUInt32BE(0);
  const start = hour * intervalMs + (seed % (intervalMs - durationMs + 1));
  return { start, end: start + durationMs };
};

export const startSeasonalAvatarScheduler = (client: Client) => {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  const applied = new Map<string, string | null>();

  const refresh = async () => {
    try {
      // A failed theme read must not spuriously restore a seasonal avatar.
      const theme = getSeasonalTheme(await getBotThemeMode());
      const now = Date.now();
      const environments = new Set(
        Object.values(SEASONAL_THEMES).flatMap(
          (profile) => profile?.avatar?.environments ?? [],
        ),
      );
      const guildIds = new Set([
        ...[...environments].map((environment) => BOT_GUILDS[environment]),
        ...applied.keys(),
      ]);
      for (const guildId of guildIds) {
        if (stopped) break;
        const profile = theme?.avatar;
        const enabled = profile?.environments.some(
          (environment) => BOT_GUILDS[environment] === guildId,
        );
        const window =
          enabled && profile?.schedule.mode === 'random-window'
            ? getSeasonalAvatarWindow(
                guildId,
                now,
                profile.schedule.durationMs,
                profile.schedule.intervalMs,
              )
            : undefined;
        let image = enabled ? profile?.image : undefined;
        if (enabled && window && (now < window.start || now >= window.end)) {
          image = profile?.outsideWindowImage;
        }
        const avatar = image?.href ?? null;
        if (applied.has(guildId) && applied.get(guildId) === avatar) continue;
        const guild = await client.guilds.fetch(guildId);
        // Normal appearance inherits the global avatar, including future changes.
        if (!applied.has(guildId) && avatar === null) {
          const member = await guild.members.fetchMe();
          if (!member.avatar) {
            applied.set(guildId, null);
            continue;
          }
        }
        await guild.members.editMe({
          avatar: image ? await readFile(image) : null,
          reason: 'Seasonal avatar schedule',
        });
        applied.set(guildId, avatar);
      }
    } catch (error) {
      console.error('Failed to update seasonal guild avatar', error);
    } finally {
      // Sequential polling avoids piling up requests while Discord rate-limits.
      if (!stopped) {
        timer = setTimeout(() => void refresh(), 30_000);
        timer.unref();
      }
    }
  };

  client.once(Events.Invalidated, () => {
    stopped = true;
    clearTimeout(timer);
  });
  void refresh();
};
