import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { MusicPage } from '@/features/music/music-page';
import { musicActivitySearchSchema } from '../../../src/modules/music/music-activity-target';

export const Route = createFileRoute('/music')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { query?: string; game?: boolean } => {
    const parsed = musicActivitySearchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
  component: MusicRoute,
});
const rootRoute = getRouteApi('__root__');
function MusicRoute() {
  const { stats } = rootRoute.useLoaderData();
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
