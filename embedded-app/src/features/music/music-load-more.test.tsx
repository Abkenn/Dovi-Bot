import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MusicLoadMore } from './music-load-more';

afterEach(() => vi.unstubAllGlobals());

it('loads once when the sentinel enters view and disconnects when unmounted', () => {
  const loadMore = vi.fn();
  const observe = vi.fn();
  const disconnect = vi.fn();
  const trigger = vi.fn<(isIntersecting: boolean) => void>();
  class Observer implements IntersectionObserver {
    root = null;
    rootMargin = '0px';
    scrollMargin = '0px';
    thresholds = [0];
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
    takeRecords = () => [];
    constructor(callback: IntersectionObserverCallback) {
      trigger.mockImplementation((isIntersecting) =>
        callback(
          [
            {
              isIntersecting,
              target: document.body,
              time: 0,
              intersectionRatio: isIntersecting ? 1 : 0,
              boundingClientRect: new DOMRect(),
              intersectionRect: new DOMRect(),
              rootBounds: null,
            },
          ],
          this,
        ),
      );
    }
  }
  vi.stubGlobal('IntersectionObserver', Observer);
  const view = render(
    <MusicLoadMore
      hasNextPage
      loading={false}
      failed={false}
      loadMore={loadMore}
    />,
  );
  expect(observe).toHaveBeenCalledTimes(1);
  act(() => trigger(false));
  expect(loadMore).not.toHaveBeenCalled();
  act(() => trigger(true));
  expect(loadMore).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(disconnect).toHaveBeenCalledTimes(2);
});

it('provides a manual retry and disables loading controls', () => {
  const loadMore = vi.fn();
  const view = render(
    <MusicLoadMore hasNextPage loading={false} failed loadMore={loadMore} />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Could not load more tracks',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load more tracks' }));
  expect(loadMore).toHaveBeenCalledTimes(1);
  view.rerender(
    <MusicLoadMore hasNextPage loading failed={false} loadMore={loadMore} />,
  );
  expect(
    screen.getByRole('button', { name: 'Loading more tracks…' }),
  ).toBeDisabled();
  view.rerender(
    <MusicLoadMore
      hasNextPage={false}
      loading={false}
      failed={false}
      loadMore={loadMore}
    />,
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
