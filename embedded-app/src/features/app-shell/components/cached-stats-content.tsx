import type { MouseEvent } from 'react';
import { useState } from 'react';
import { ArchivedGamePage } from '@/features/archived-game/pages/archived-game-page';
import { GeneralStatsPage } from '@/features/general-stats/pages/general-stats-page';
import { LiveStatsPage } from '@/features/live-stats/pages/live-stats-page';
import type { LiveStatsSnapshot } from '../lib/live-stats-cache';
import { OfflineSnapshotBanner } from './offline-snapshot-banner';

type CachedStatsContentProps = {
  snapshot: LiveStatsSnapshot;
};

const getGameIdFromPathname = (pathname: string) => {
  const gamePathIndex = pathname.lastIndexOf('/games/');

  if (gamePathIndex < 0) {
    return null;
  }

  return decodeURIComponent(pathname.slice(gamePathIndex + '/games/'.length));
};

export const CachedStatsContent = ({ snapshot }: CachedStatsContentProps) => {
  const [pathname, setPathname] = useState(window.location.pathname);
  const showCachedRoute = (event: MouseEvent<HTMLElement>) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const link = event.target.closest('a');

    if (!link) {
      return;
    }

    const targetUrl = new URL(link.href);
    event.preventDefault();
    event.stopPropagation();
    window.history.replaceState(null, '', targetUrl);
    setPathname(targetUrl.pathname);
  };
  const gameId = getGameIdFromPathname(pathname);
  const game = snapshot.stats.games.find(
    (candidate) => candidate.id === gameId,
  );

  if (pathname.endsWith('/stats')) {
    return (
      <section onClickCapture={showCachedRoute}>
        <OfflineSnapshotBanner cachedAt={snapshot.cachedAt} />
        <GeneralStatsPage
          games={snapshot.stats.games}
          generalStats={snapshot.stats.generalStats}
        />
      </section>
    );
  }

  if (game) {
    return (
      <section onClickCapture={showCachedRoute}>
        <OfflineSnapshotBanner cachedAt={snapshot.cachedAt} />
        <ArchivedGamePage game={game} games={snapshot.stats.games} />
      </section>
    );
  }

  return (
    <section onClickCapture={showCachedRoute}>
      <OfflineSnapshotBanner cachedAt={snapshot.cachedAt} />
      <LiveStatsPage stats={snapshot.stats} />
    </section>
  );
};
