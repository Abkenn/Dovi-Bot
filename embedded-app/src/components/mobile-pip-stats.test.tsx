import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MobilePipStats } from './mobile-pip-stats';

describe('MobilePipStats', () => {
  it('renders a compact portrait PiP summary without dashboard cards', () => {
    render(
      <MobilePipStats
        gameName="Dark Souls III"
        deaths={178}
        bossDeaths={130}
        nonBossDeaths={48}
        killedBossCount={20}
      />,
    );

    const summary = screen.getByText('Dark Souls III').parentElement;

    expect(summary).toHaveClass('mobile-pip-only', 'overflow-hidden');
    expect(screen.getByLabelText('178')).toHaveClass('text-xl', 'leading-none');
    expect(screen.getByLabelText('20')).toHaveClass('text-2xl', 'leading-none');
    expect(screen.getByText('Total deaths')).toBeInTheDocument();
    expect(screen.getByText('Boss deaths')).toBeInTheDocument();
    expect(screen.getByText('Non-boss deaths')).toBeInTheDocument();
    expect(screen.getByText('Bosses killed')).toBeInTheDocument();
  });

  it('marks compact totals as incomplete when non-boss deaths are unknown', () => {
    render(
      <MobilePipStats
        gameName="Dark Souls II"
        deaths={84}
        bossDeaths={84}
        nonBossDeaths={null}
        killedBossCount={3}
      />,
    );

    expect(screen.getByText('84+')).toBeInTheDocument();
    expect(screen.getByText('Not tracked')).toBeInTheDocument();
  });
});
