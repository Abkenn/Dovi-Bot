import { Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useDiscordSdk } from '@/hooks/use-discord-sdk';
import { resolveActivityTargetGame } from '@/lib/activity-target';
import type { LiveStats } from '@/live-stats.types';
import {
  isMusicActivityTarget,
  parseMusicActivityTarget,
} from '../../../../../src/modules/music/music-activity-target';
import { cacheLiveStats } from '../lib/live-stats-cache';

type CurrentBuildContentProps = {
  discordClientId: string;
  stats: LiveStats;
};

export const CurrentBuildContent = ({
  discordClientId,
  stats,
}: CurrentBuildContentProps) => {
  const customId = useDiscordSdk(discordClientId);
  const navigate = useNavigate();
  const handledCustomId = useRef<string | null>(null);

  useEffect(() => {
    cacheLiveStats(stats);
  }, [stats]);

  useEffect(() => {
    const requestedGameName = stats.initialGameName ?? customId;

    if (!requestedGameName || handledCustomId.current === requestedGameName) {
      return;
    }

    handledCustomId.current = requestedGameName;
    const musicTarget = parseMusicActivityTarget(requestedGameName);
    if (isMusicActivityTarget(requestedGameName)) {
      void navigate({ to: '/music', search: musicTarget ?? {}, replace: true });
      return;
    }
    const targetGame = resolveActivityTargetGame(
      stats.games,
      requestedGameName,
    );

    if (targetGame) {
      void navigate({
        to: '/games/$gameId',
        params: { gameId: targetGame.id },
        replace: true,
      });
    }
  }, [customId, navigate, stats.games, stats.initialGameName]);

  return <Outlet />;
};
