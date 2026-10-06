import { ExternalLink, Trophy } from 'lucide-react';
import { ActivityExternalLink } from '@/components/activity-external-link';
import type { MusicFacts } from '../../../../src/modules/music/music.types';
import type { MusicContentProps, MusicResultsProps } from './music.types';
import { MusicSkeleton } from './music-skeleton';

const formatTimestamp = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const MusicFactsCards = ({ facts }: { facts: MusicFacts | null }) => (
  <section aria-label="Music highlights" className="grid gap-3 sm:grid-cols-2">
    {[
      { label: 'Most played track', fact: facts?.track },
      { label: 'Most played game series', fact: facts?.series },
    ].map(({ label, fact }) => (
      <article key={label} className="min-w-0 rounded-xl border bg-card p-5">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Trophy className="size-4 text-primary" aria-hidden="true" />
          {label}
        </p>
        <p className="mt-3 text-lg font-semibold break-words">
          {fact?.title ?? 'No data yet'}
        </p>
        {fact ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {fact.count} plays
          </p>
        ) : null}
      </article>
    ))}
  </section>
);

const MusicResults = ({ results, game, total }: MusicResultsProps) => {
  if (!results)
    return <p role="status">Music history has not been uploaded yet.</p>;
  if (!results.length)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No tracks found. Try another track, artist, game, or series name.
      </p>
    );
  return (
    <section
      aria-label="Music search results"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="border-b px-4 py-3 text-sm font-medium">
        {game ? `${total ?? results.length} tracks` : 'Best match'}
      </div>
      <ul className="divide-y">
        {results.map((result) => (
          <li
            key={`${result.game}:${result.title}`}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              {result.url ? (
                <ActivityExternalLink
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold break-words transition-colors hover:text-primary"
                >
                  {result.title}
                  <ExternalLink
                    className="size-3 shrink-0"
                    aria-hidden="true"
                  />
                </ActivityExternalLink>
              ) : (
                <p className="text-sm font-semibold break-words">
                  {result.title}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {result.game ? `${result.game} · ` : ''}Last played{' '}
                {result.date} · {formatTimestamp(result.offsetSeconds)}
                {result.url ? '' : ' · Video unavailable'}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs tabular-nums">
              {result.count} plays
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const MusicContent = ({
  data,
  game,
  total,
  searching = false,
}: MusicContentProps) => {
  if (data.kind === 'loading') return <MusicSkeleton searching={searching} />;
  if (data.kind === 'error')
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        Music is unavailable right now. Try again shortly.
      </p>
    );
  if (data.kind === 'facts') return <MusicFactsCards facts={data.facts} />;
  return <MusicResults results={data.results} game={game} total={total} />;
};
