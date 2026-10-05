import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render as renderView,
  screen,
  within,
} from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/features/game-stats/components/game-switcher', () => ({
  GameSwitcher: () => <nav>Music navigation</nav>,
}));
const api = vi.hoisted(() => ({
  loadMusicFacts: vi.fn(),
  searchMusicPage: vi.fn(),
}));
vi.mock('./music-api', () => api);

import { MusicPage } from './music-page';

const render = (
  view: ReactElement,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) =>
  renderView(<QueryClientProvider client={client}>{view}</QueryClientProvider>);

beforeEach(() => {
  vi.resetAllMocks();
  api.loadMusicFacts.mockResolvedValue({
    track: { title: 'Theme', count: 5 },
    series: { title: 'Dark Souls', count: 9 },
  });
  api.searchMusicPage.mockResolvedValue({
    results: [
      {
        title: 'Boss Theme',
        game: 'Dark Souls 2',
        count: 3,
        date: '2026-01-01',
        offsetSeconds: 90,
        url: 'https://www.youtube.com/watch?v=video&t=90s',
      },
    ],
    total: 1,
    nextCursor: null,
  });
});
it('shows only two facts initially, searches compact game results, and resets on returning', async () => {
  const view = render(<MusicPage games={[]} />);
  await screen.findByText('Most played track');
  expect(
    within(screen.getByRole('region', { name: 'Music highlights' })).getByText(
      'Theme',
    ),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Music query' }), {
    target: { value: 'Dark Souls' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Search by' }), {
    target: { value: 'game' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search music' }));
  await screen.findByRole('link', { name: /Boss Theme/ });
  expect(api.searchMusicPage).toHaveBeenCalledWith(
    { query: 'Dark Souls', game: true, cursor: 0 },
    expect.any(AbortSignal),
  );
  expect(screen.queryByText('Most played track')).not.toBeInTheDocument();
  view.unmount();
  render(<MusicPage games={[]} />);
  await screen.findByText('Most played track');
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(screen.getByRole('combobox')).toHaveValue('track');
});
it('runs a command launch query automatically without fetching default facts', async () => {
  render(
    <MusicPage games={[]} initialSearch={{ query: 'Theme', game: false }} />,
  );
  await screen.findByRole('link', { name: /Boss Theme/ });
  expect(api.loadMusicFacts).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox')).toHaveValue('Theme');
});
it('shows empty and failed search states without restoring facts', async () => {
  api.searchMusicPage
    .mockResolvedValueOnce({ results: [], total: 0, nextCursor: null })
    .mockRejectedValueOnce(new Error('Offline'));
  render(
    <MusicPage games={[]} initialSearch={{ query: 'Missing', game: false }} />,
  );
  await screen.findByText(
    'No tracks found. Try another track, artist, game, or series name.',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Search music' }));
  await screen.findByRole('alert');
  expect(screen.queryByText('Most played track')).not.toBeInTheDocument();
});

it('reuses fresh facts when returning to the tab without restoring an old query', async () => {
  const client = new QueryClient();
  const first = render(<MusicPage games={[]} />, client);
  await screen.findByText('Most played track');
  first.unmount();
  render(<MusicPage games={[]} />, client);
  await screen.findByText('Most played track');
  expect(api.loadMusicFacts).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('textbox')).toHaveValue('');
});

it('keeps loaded tracks after a later page fails and lets the user retry', async () => {
  api.searchMusicPage
    .mockResolvedValueOnce({
      results: [
        {
          title: 'First track',
          game: null,
          count: 1,
          date: '2026-01-01',
          offsetSeconds: 0,
          url: null,
        },
      ],
      total: 21,
      nextCursor: 20,
    })
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce({
      results: [
        {
          title: 'Last track',
          game: null,
          count: 1,
          date: '2026-01-01',
          offsetSeconds: 0,
          url: null,
        },
      ],
      total: 21,
      nextCursor: null,
    });
  render(
    <MusicPage games={[]} initialSearch={{ query: 'Series', game: true }} />,
  );
  const results = await screen.findByRole('region', {
    name: 'Music search results',
  });
  expect(within(results).getByText('First track')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Load more tracks' }));
  await screen.findByText('Could not load more tracks. Try again.');
  expect(within(results).getByText('First track')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Load more tracks' }));
  await screen.findByText('Last track');
  expect(within(results).getByText('First track')).toBeInTheDocument();
});

it('appends server pages and keeps earlier unlinked tracks visible', async () => {
  const tracks = Array.from({ length: 21 }, (_, index) => ({
    title: `Track ${index}`,
    game: null,
    count: 1,
    date: '2026-01-01',
    offsetSeconds: 60,
    url: null,
  }));
  api.searchMusicPage
    .mockResolvedValueOnce({
      results: tracks.slice(0, 20),
      total: 21,
      nextCursor: 20,
    })
    .mockResolvedValueOnce({
      results: tracks.slice(20),
      total: 21,
      nextCursor: null,
    });
  render(
    <MusicPage games={[]} initialSearch={{ query: 'Series', game: true }} />,
  );
  await screen.findByText('21 tracks');
  expect(screen.queryByText('Track 20')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Load more tracks' }));
  await screen.findByText('Track 20');
  expect(api.searchMusicPage).toHaveBeenLastCalledWith(
    { query: 'Series', game: true, cursor: 20 },
    expect.any(AbortSignal),
  );
  expect(
    screen.queryByRole('button', { name: 'Load more tracks' }),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Track 19')).toBeInTheDocument();
});

it('handles missing history and disables offline requests', async () => {
  api.searchMusicPage.mockResolvedValue({
    results: null,
    total: 0,
    nextCursor: null,
  });
  const view = render(
    <MusicPage games={[]} initialSearch={{ query: 'Theme', game: false }} />,
  );
  await screen.findByText('Music history has not been uploaded yet.');
  view.unmount();
  vi.clearAllMocks();
  render(<MusicPage games={[]} offline />);
  expect(screen.getByRole('button', { name: 'Search music' })).toBeDisabled();
  expect(api.searchMusicPage).not.toHaveBeenCalled();
  expect(api.loadMusicFacts).not.toHaveBeenCalled();
});

it('ignores a stale facts response after a search replaces it', async () => {
  const complete = vi.fn<() => void>();
  const pending = new Promise<null>((resolve) => {
    complete.mockImplementation(() => resolve(null));
  });
  api.loadMusicFacts.mockReturnValue(pending);
  render(<MusicPage games={[]} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Theme' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search music' }));
  await screen.findByRole('link', { name: /Boss Theme/ });
  await act(async () => {
    complete();
    await pending;
  });
  expect(screen.getByRole('link', { name: /Boss Theme/ })).toBeInTheDocument();
  expect(screen.queryByText('Most played track')).not.toBeInTheDocument();
});
