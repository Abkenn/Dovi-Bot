import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Music2, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { GameSwitcher } from '@/features/game-stats/components/game-switcher';
import { StatsPageHeader } from '@/features/game-stats/components/stats-page-header';
import type { MusicPageProps, SearchState } from './music.types';
import { MusicContent } from './music-content';
import { MusicLoadMore } from './music-load-more';
import { MusicPipSummary } from './music-pip-summary';
import { musicQueries } from './music-queries';
import { resolveMusicData } from './music-query-state';

export const MusicPage = ({
  games,
  initialSearch,
  offline = false,
}: MusicPageProps) => {
  const [query, setQuery] = useState(initialSearch?.query ?? '');
  const [game, setGame] = useState(initialSearch?.game ?? false);
  const [submitted, setSubmitted] = useState<SearchState | null>(
    initialSearch ?? null,
  );
  const reducedMotion = useReducedMotion();
  const facts = useQuery(
    musicQueries.facts.queryOptions({
      enabled: !offline && !submitted,
      staleTime: 60_000,
    }),
  );
  const search = useInfiniteQuery(
    musicQueries.searchPage.infiniteOptions({
      input: (cursor: number) => ({
        query: submitted?.query ?? '',
        game: submitted?.game ?? false,
        cursor,
      }),
      initialPageParam: 0,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      enabled: !offline && submitted !== null,
      staleTime: 30_000,
      retry: false,
    }),
  );
  const data = resolveMusicData({
    offline,
    searching: submitted !== null,
    facts: facts.data,
    pages: search.data?.pages,
    failed: submitted ? search.isError : facts.isError,
  });

  return (
    <main className="music-frame mx-auto min-h-svh w-full max-w-5xl space-y-5 px-3 py-3 sm:px-8 sm:py-12">
      <MusicPipSummary data={data} />
      <div className="music-full space-y-6">
        <StatsPageHeader
          eyebrow="Dovi Music History"
          title="Music Stats"
          statusIcon={<Music2 aria-hidden="true" />}
          statusLabel="Find a track or game"
        />
        <GameSwitcher games={games} selectedGameId="music" />
        <form
          className="flex flex-wrap gap-2 rounded-xl border bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = query.trim();
            if (trimmed.length < 2) return;
            if (submitted?.query === trimmed && submitted.game === game) {
              void search.refetch();
              return;
            }
            setSubmitted({ query: trimmed, game });
          }}
        >
          <NativeSelect
            aria-label="Search by"
            value={game ? 'game' : 'track'}
            onChange={(event) => setGame(event.target.value === 'game')}
            disabled={offline}
          >
            <option value="track">Track / artist</option>
            <option value="game">Game / series</option>
          </NativeSelect>
          <Input
            aria-label="Music query"
            placeholder={
              game ? 'Search a game or series…' : 'Search a track or artist…'
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={2}
            maxLength={100}
            required
            disabled={offline}
            className="min-w-40 flex-1"
          />
          <Button
            aria-label="Search music"
            type="submit"
            disabled={offline || query.trim().length < 2}
          >
            <Search className="size-4" aria-hidden="true" />
            Search
          </Button>
        </form>
        <motion.div
          key={
            submitted
              ? `${submitted.game}:${submitted.query}:${data.kind}`
              : data.kind
          }
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
        >
          <MusicContent
            data={data}
            game={submitted?.game ?? false}
            total={search.data?.pages[0]?.total}
            searching={submitted !== null}
          />
          {search.isRefetchError ? (
            <p role="alert">
              Could not refresh tracks. Your previous results are still
              available.
            </p>
          ) : null}
          {data.kind === 'results' ? (
            <MusicLoadMore
              hasNextPage={search.hasNextPage && !offline}
              loading={search.isFetching}
              failed={search.isFetchNextPageError}
              loadMore={search.fetchNextPage}
            />
          ) : null}
        </motion.div>
      </div>
    </main>
  );
};
