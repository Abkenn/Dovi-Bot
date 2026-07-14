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
          },
          { name: 'Vordt', deaths: 3 },
        ]}
      />,
    );

    expect(screen.getByText('Iudex Gundyr')).toBeInTheDocument();
    expect(screen.getByText('Vordt')).toBeInTheDocument();
    expect(screen.getByLabelText('7')).toBeInTheDocument();
  });

  it('keeps existing rows mounted while values change and new rows enter', () => {
    const { rerender } = render(
      <BossHistory bosses={[{ name: 'Iudex Gundyr', deaths: 7 }]} />,
    );
    const existingRow = screen.getByText('Iudex Gundyr');

    rerender(
      <BossHistory
        bosses={[
          { name: 'Iudex Gundyr', deaths: 8 },
          { name: 'Vordt', deaths: 3 },
        ]}
      />,
    );

    expect(screen.getByText('Iudex Gundyr')).toBe(existingRow);
    expect(screen.getByLabelText('8')).toBeInTheDocument();
    expect(screen.getByText('Vordt')).toBeInTheDocument();
  });

  it('shows an empty history message', () => {
    render(<BossHistory bosses={[]} />);
    expect(screen.getByText(/No defeated bosses/)).toBeInTheDocument();
  });
});
