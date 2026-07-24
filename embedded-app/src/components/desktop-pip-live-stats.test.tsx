import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DesktopPipLiveStats } from './desktop-pip-live-stats';

const elapsedSeconds = vi.hoisted(() => ({ value: 127 as number | null }));

vi.mock('../hooks/use-elapsed-seconds', () => ({
  useElapsedSeconds: () => elapsedSeconds.value,
}));

describe('DesktopPipLiveStats', () => {
  it('fits game totals and the active attempt into one compact panel', () => {
    render(
      <DesktopPipLiveStats
        gameName="Dark Souls III"
        totalDeaths={198}
        killedBossCount={21}
        boss={{
          name: 'Demon Prince',
          status: 'ACTIVE',
          deaths: 0,
          attemptNumber: 1,
          attemptStartedAt: '2026-07-17T20:00:00.000Z',
          runbackSeconds: null,
          pausedAt: null,
          pauseReason: null,
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Demon Prince' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) => element?.textContent === '198 deaths · 21 bosses',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('2:07')).toBeInTheDocument();
    expect(screen.getByText('Attempt time')).toBeInTheDocument();
  });

  it('subtracts a known runback and labels the runback phase', () => {
    elapsedSeconds.value = 90;

    const { rerender } = render(
      <DesktopPipLiveStats
        gameName="Dark Souls III"
        totalDeaths={223}
        killedBossCount={22}
        boss={{
          name: 'Darkeater Midir',
          status: 'ACTIVE',
          deaths: 4,
          attemptNumber: 5,
          attemptStartedAt: '2026-07-17T20:00:00.000Z',
          runbackSeconds: 80,
          pausedAt: null,
          pauseReason: null,
        }}
      />,
    );

    expect(screen.getByText('0:10')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();

    elapsedSeconds.value = 70;
    rerender(
      <DesktopPipLiveStats
        gameName="Dark Souls III"
        totalDeaths={223}
        killedBossCount={22}
        boss={{
          name: 'Darkeater Midir',
          status: 'ACTIVE',
          deaths: 4,
          attemptNumber: 5,
          attemptStartedAt: '2026-07-17T20:00:00.000Z',
          runbackSeconds: 80,
          pausedAt: null,
          pauseReason: null,
        }}
      />,
    );

    expect(screen.getByText('Runback')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('shows an unknown attempt time when timing is unavailable', () => {
    elapsedSeconds.value = null;

    render(
      <DesktopPipLiveStats
        gameName="Dark Souls III"
        totalDeaths={223}
        killedBossCount={22}
        boss={{
          name: 'Darkeater Midir',
          status: 'PAUSED',
          deaths: 4,
          attemptNumber: null,
          attemptStartedAt: null,
          runbackSeconds: 80,
          pausedAt: '2026-07-17T20:00:00.000Z',
          pauseReason: 'Break',
        }}
      />,
    );

    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });
});
