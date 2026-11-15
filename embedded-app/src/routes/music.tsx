import { createFileRoute } from '@tanstack/react-router';
import {
  musicFactsOptions,
  musicQueries,
} from '@/features/music/music.queries';
import { MusicPage } from '@/features/music/music-page';
import { useLiveStatsQuery } from '@/live-stats.query';
import { musicActivitySearchSchema } from '../../../src/modules/music/music-activity-target';

export const Route = createFileRoute('/music')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { query?: string; game?: boolean } => {
    const parsed = musicActivitySearchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
  loaderDeps: ({ search }) => ({ query: search.query }),
  loader: async ({ context, deps }) => {
    if (!deps.query) {
      // A music failure stays local; the stats app remains available.
      await musicQueries
        .load(context.queryClient, { facts: musicFactsOptions })
        .catch(() => undefined);
    }
  },
  component: MusicRoute,
});
function MusicRoute() {
  const { stats } = useLiveStatsQuery().data;
  const search = Route.useSearch();
  const initialSearch = search.query
    ? { query: search.query, game: search.game ?? false }
    : undefined;
  return (
    <MusicPage
      games={stats.games}
      initialSearch={initialSearch}
      key={JSON.stringify(search)}
    />
  );
}
