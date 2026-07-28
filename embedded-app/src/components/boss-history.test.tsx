import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BossHistory } from './boss-history';

describe('BossHistory', () => {
  it('renders killed and paused bosses in death-ranking order', () => {
    render(
      <BossHistory
        bosses={[
          {
            name: 'Darkeater Midir',
            deaths: 16,
            outcome: 'PAUSED',
            attempts: 17,
            averageAttemptSeconds: 95,
            winningAttemptSeconds: null,
            achievements: ['MOST_DEATHS', 'TOUGHEST_OVERALL'],
          },
          { name: 'Pontiff Sulyvahn', deaths: 12, outcome: 'KILLED' },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Bosses' })).toBeInTheDocument();
    expect(screen.getByText('Darkeater Midir')).toBeInTheDocument();
    expect(screen.getByText('Pontiff Sulyvahn')).toBeInTheDocument();
    expect(screen.getByLabelText('16')).toBeInTheDocument();
    expect(screen.getByLabelText('Paused')).toBeInTheDocument();
    expect(screen.getByLabelText('Killed')).toBeInTheDocument();
    expect(screen.getByText(/17 attempts/)).toHaveTextContent(
      '17 attempts · 1m 35s avg',
    );
    expect(
      screen.getByRole('button', {
        name: /Most deaths: Highest death count in this game/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Toughest overall: Strongest balance/,
      }),
    ).toBeInTheDocument();
  });

  it('keeps existing rows mounted while values change and new rows enter', () => {
    const { rerender } = render(
      <BossHistory
        bosses={[{ name: 'Iudex Gundyr', deaths: 7, outcome: 'KILLED' }]}
      />,
    );
    const existingRow = screen.getByText('Iudex Gundyr');

    rerender(
      <BossHistory
        bosses={[
          { name: 'Iudex Gundyr', deaths: 8, outcome: 'KILLED' },
          { name: 'Vordt', deaths: 3, outcome: 'PAUSED' },
        ]}
      />,
    );

    expect(screen.getByText('Iudex Gundyr')).toBe(existingRow);
    expect(screen.getByLabelText('8')).toBeInTheDocument();
    expect(screen.getByText('Vordt')).toBeInTheDocument();
  });

  it('shows an empty history message', () => {
    render(<BossHistory bosses={[]} />);
    expect(screen.getByText(/No bosses recorded/)).toBeInTheDocument();
  });
});
