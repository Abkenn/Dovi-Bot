import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/features/game-stats/components/game-switcher', () => ({
  GameSwitcher: () => <nav>Music navigation</nav>,
}));
const api = vi.hoisted(() => ({
  loadMusicFacts: vi.fn(),
  searchMusic: vi.fn(),
}));
vi.mock('./music-api', () => api);

import { MusicPage } from './music-page';

beforeEach(() => {
  vi.clearAllMocks();
  api.loadMusicFacts.mockResolvedValue({
    track: { title: 'Theme', count: 5 },
    series: { title: 'Dark Souls', count: 9 },
  });
  api.searchMusic.mockResolvedValue([
    {
      title: 'Boss Theme',
      game: 'Dark Souls 2',
      count: 3,
      date: '2026-01-01',
      offsetSeconds: 90,
      url: 'https://www.youtube.com/watch?v=video&t=90s',
    },
  ]);
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
  expect(api.searchMusic).toHaveBeenCalledWith(
    { query: 'Dark Souls', game: true },
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
  api.searchMusic
    .mockResolvedValueOnce([])
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

it('paginates compact game lists and keeps unlinked tracks visible when their video is missing', async () => {
  api.searchMusic.mockResolvedValue(
    Array.from({ length: 21 }, (_, index) => ({
      title: `Track ${index}`,
      game: null,
      count: 1,
      date: '2026-01-01',
      offsetSeconds: 60,
      url: null,
    })),
  );
  render(
    <MusicPage games={[]} initialSearch={{ query: 'Series', game: true }} />,
  );
  await screen.findByText('21 tracks');
  expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Track 20')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('Track 19')).toBeInTheDocument();
});

it('handles missing history and disables offline requests', async () => {
  api.searchMusic.mockResolvedValue(null);
  const view = render(
    <MusicPage games={[]} initialSearch={{ query: 'Theme', game: false }} />,
  );
  await screen.findByText('Music history has not been uploaded yet.');
  view.unmount();
  vi.clearAllMocks();
  render(<MusicPage games={[]} offline />);
  expect(screen.getByRole('button', { name: 'Search music' })).toBeDisabled();
  expect(api.searchMusic).not.toHaveBeenCalled();
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
