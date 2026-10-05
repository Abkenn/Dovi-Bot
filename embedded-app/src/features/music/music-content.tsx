import { ExternalLink, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
  MusicActivityResult,
  MusicFacts,
} from '../../../../src/modules/music/music.types';
import type { MusicData } from './music.types';

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

const MusicResults = ({
  results,
  game,
}: {
  results: MusicActivityResult[] | null;
  game: boolean;
}) => {
  const [page, setPage] = useState(0);
  if (!results)
    return <p role="status">Music history has not been uploaded yet.</p>;
  if (!results.length)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No tracks found. Try another track, artist, game, or series name.
      </p>
    );
  const visible = results.slice(page * 20, (page + 1) * 20);
  return (
    <section
      aria-label="Music search results"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="border-b px-4 py-3 text-sm font-medium">
        {game ? `${results.length} tracks` : 'Best match'}
      </div>
      <ul className="divide-y">
        {visible.map((result) => (
          <li
            key={`${result.game}:${result.title}`}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              {result.url ? (
                <a
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
                </a>
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
      {results.length > 20 ? (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Back
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {Math.ceil(results.length / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * 20 >= results.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
};

export const MusicContent = ({
  data,
  game,
}: {
  data: MusicData;
  game: boolean;
}) => {
  if (data.kind === 'loading')
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading music…
      </p>
    );
  if (data.kind === 'error')
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        Music is unavailable right now. Try again shortly.
      </p>
    );
  if (data.kind === 'facts') return <MusicFactsCards facts={data.facts} />;
  return <MusicResults results={data.results} game={game} />;
};
