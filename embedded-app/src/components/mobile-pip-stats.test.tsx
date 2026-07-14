import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MobilePipStats } from './mobile-pip-stats';

describe('MobilePipStats', () => {
  it('renders a compact portrait PiP summary without dashboard cards', () => {
    render(
      <MobilePipStats
        gameName="Dark Souls III"
        deaths={178}
        killedBossCount={20}
      />,
    );

    const summary = screen.getByText('Dark Souls III').parentElement;

    expect(summary).toHaveClass('mobile-pip-only', 'overflow-hidden');
    expect(screen.getByLabelText('178')).toHaveClass('text-xl', 'leading-none');
    expect(screen.getByLabelText('20')).toHaveClass('text-2xl', 'leading-none');
    expect(screen.getByText('Deaths')).toBeInTheDocument();
    expect(screen.getByText('Bosses killed')).toBeInTheDocument();
  });
});
