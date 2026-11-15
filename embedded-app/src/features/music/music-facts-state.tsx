import { CatchBoundary } from '@tanstack/react-router';
import { Suspense } from 'react';
import { MusicContent } from './music-content';
import { MusicFactsData } from './music-facts-data';
import { MusicPipSummary } from './music-pip-summary';

type MusicFactsStateProps = { compact?: boolean };

export const MusicFactsState = ({ compact = false }: MusicFactsStateProps) => (
  <CatchBoundary
    getResetKey={() => 'music-facts'}
    onCatch={() => undefined}
    errorComponent={() =>
      compact ? (
        <MusicPipSummary data={{ kind: 'error' }} />
      ) : (
        <MusicContent data={{ kind: 'error' }} game={false} />
      )
    }
  >
    <Suspense
      fallback={
        compact ? (
          <MusicPipSummary data={{ kind: 'loading' }} />
        ) : (
          <MusicContent data={{ kind: 'loading' }} game={false} />
        )
      }
    >
      <MusicFactsData compact={compact} />
    </Suspense>
  </CatchBoundary>
);
