import { Music2 } from 'lucide-react';
import type { MusicData } from './music.types';

export const MusicPipSummary = ({ data }: { data: MusicData }) => {
  const rows =
    data.kind === 'facts'
      ? [
          { label: 'Track', fact: data.facts?.track },
          { label: 'Series', fact: data.facts?.series },
        ]
      : [];
  const result = data.kind === 'results' ? data.results?.[0] : null;
  return (
    <aside className="music-pip-only min-h-0 min-w-0 flex-col gap-2 rounded-xl border bg-card p-3">
      <p className="flex shrink-0 items-center justify-center gap-2 text-xs font-semibold">
        <Music2 className="size-3.5 text-primary" aria-hidden="true" />
        Music Stats
      </p>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-hidden text-xs">
        {rows.map(({ label, fact }) => (
          <p key={label} className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-muted-foreground">{label}: </span>
            <span className="min-w-0 flex-1 truncate" title={fact?.title}>
              {fact?.title ?? 'No data yet'}
            </span>
            {fact ? (
              <span className="shrink-0 tabular-nums">{fact.count} plays</span>
            ) : null}
          </p>
        ))}
        {result ? (
          <p className="flex min-w-0 items-center gap-1">
            <span className="min-w-0 flex-1 truncate" title={result.title}>
              {result.title}
            </span>
            <span className="shrink-0 tabular-nums">{result.count} plays</span>
          </p>
        ) : null}
        {data.kind === 'loading' ? (
          <p className="text-center">Loading music…</p>
        ) : null}
        {data.kind === 'error' ? (
          <p className="text-center">Music unavailable</p>
        ) : null}
        {data.kind === 'results' && !result ? (
          <p className="text-center">No tracks found</p>
        ) : null}
      </div>
      <p className="shrink-0 text-center text-[0.625rem] text-muted-foreground">
        Expand the activity to search
      </p>
    </aside>
  );
};
