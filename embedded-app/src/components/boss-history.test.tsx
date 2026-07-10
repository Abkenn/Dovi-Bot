import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BossHistory } from './boss-history';

describe('BossHistory', () => {
  it('renders every killed boss in journey order', () => {
    render(
      <BossHistory
        bosses={[
          {
            name: 'Iudex Gundyr',
            deaths: 7,
            killedAt: '2026-07-09T18:30:00.000Z',
          },
          { name: 'Vordt', deaths: 3, killedAt: '2026-07-10T18:30:00.000Z' },
        ]}
      />,
    );

    expect(screen.getByText('Iudex Gundyr')).toBeInTheDocument();
    expect(screen.getByText('Vordt')).toBeInTheDocument();
    expect(screen.getByText('7 deaths')).toBeInTheDocument();
  });

  it('shows an empty history message', () => {
    render(<BossHistory bosses={[]} />);
    expect(screen.getByText(/No defeated bosses/)).toBeInTheDocument();
  });
});
