import { Music2, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { GameSwitcher } from '@/features/game-stats/components/game-switcher';
import { StatsPageHeader } from '@/features/game-stats/components/stats-page-header';
import type { MusicData, MusicPageProps, SearchState } from './music.types';
import { loadMusicFacts, searchMusic } from './music-api';
import { MusicContent } from './music-content';
import { MusicPipSummary } from './music-pip-summary';

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
  const [data, setData] = useState<MusicData>({ kind: 'loading' });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (offline) {
      setData({ kind: 'error' });
      return;
    }
    const controller = new AbortController();
    setData({ kind: 'loading' });
    const request = submitted
      ? searchMusic(submitted, controller.signal).then(
          (results): MusicData => ({ kind: 'results', results }),
        )
      : loadMusicFacts(controller.signal).then(
          (facts): MusicData => ({ kind: 'facts', facts }),
        );
    void request
      .then((next) => {
        if (!controller.signal.aborted) setData(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setData({ kind: 'error' });
      });
    return () => controller.abort();
  }, [submitted, offline]);

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
            if (query.trim().length >= 2)
              setSubmitted({ query: query.trim(), game });
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
          <MusicContent data={data} game={submitted?.game ?? false} />
        </motion.div>
      </div>
    </main>
  );
};
