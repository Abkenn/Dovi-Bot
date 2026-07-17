import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DesktopPipLiveStats } from './desktop-pip-live-stats';

vi.mock('../hooks/use-elapsed-seconds', () => ({
  useElapsedSeconds: () => 127,
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
});
