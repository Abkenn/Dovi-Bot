import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentBossCard } from './current-boss-card';

const elapsedSeconds = vi.hoisted(() => ({ value: 83 as number | null }));

vi.mock('../hooks/use-elapsed-seconds', () => ({
  useElapsedSeconds: () => elapsedSeconds.value,
}));

describe('CurrentBossCard', () => {
  beforeEach(() => {
    elapsedSeconds.value = 83;
  });

  it('shows live boss deaths, attempt, and timer', () => {
    render(
      <CurrentBossCard
        boss={{
          name: 'Vordt',
          status: 'ACTIVE',
          deaths: 3,
          attemptNumber: 4,
          attemptStartedAt: '2026-07-10T18:00:00.000Z',
          pausedAt: null,
          pauseReason: null,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Vordt' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1:23')).toBeInTheDocument();
  });

  it('renders an intentional empty state', () => {
    render(<CurrentBossCard boss={null} />);
    expect(
      screen.getByRole('heading', { name: 'Waiting for tracking' }),
    ).toBeInTheDocument();
  });

  it('shows paused tracking with an unknown attempt and pause reason', () => {
    elapsedSeconds.value = null;
    render(
      <CurrentBossCard
        boss={{
          name: 'Nameless King',
          status: 'PAUSED',
          deaths: 19,
          attemptNumber: null,
          attemptStartedAt: null,
          pausedAt: '2026-07-10T18:00:00.000Z',
          pauseReason: 'Dinner break',
        }}
      />,
    );

    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('--:--')).toBeInTheDocument();
    expect(screen.getByText('Dinner break')).toBeInTheDocument();
  });
});
