import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { MusicLoadMoreProps } from './music.types';

export const MusicLoadMore = ({
  hasNextPage,
  loading,
  failed,
  loadMore,
}: MusicLoadMoreProps) => {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      !hasNextPage ||
      loading ||
      failed ||
      !sentinel.current ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        observer.disconnect();
        void loadMore();
      }
    });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasNextPage, loading, failed, loadMore]);
  if (!hasNextPage) return null;
  return (
    <div ref={sentinel} className="flex flex-col items-center gap-2 py-4">
      {failed ? (
        <p role="alert">Could not load more tracks. Try again.</p>
      ) : null}
      <Button
        variant="outline"
        disabled={loading}
        onClick={() => void loadMore()}
      >
        {loading ? 'Loading more tracks…' : 'Load more tracks'}
      </Button>
    </div>
  );
};
