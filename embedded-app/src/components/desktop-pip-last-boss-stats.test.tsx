import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DesktopPipLastBossStats } from './desktop-pip-last-boss-stats';

describe('DesktopPipLastBossStats', () => {
  it('shows the latest killed boss with the game totals', () => {
    render(
      <DesktopPipLastBossStats
        gameName="Dark Souls III"
        totalDeaths={246}
        killedBossCount={23}
        boss={{
          name: 'Halflight, Spear of the Church',
          deaths: 1,
        }}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Halflight, Spear of the Church',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Last boss')).toBeInTheDocument();
    expect(screen.getByText('Killed')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
