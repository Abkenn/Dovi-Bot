import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StreamEncounters } from './stream-encounters';

describe('StreamEncounters', () => {
  it('shows every boss faced in the latest stream with its outcome', () => {
    render(
      <StreamEncounters
        currentStreamWindow={{
          startAt: new Date(Date.now() - 60_000).toISOString(),
          endAt: new Date(Date.now() + 60_000).toISOString(),
        }}
        encounters={[
          { name: 'Iudex Gundyr', deaths: 6, outcome: 'KILLED' },
          { name: 'Vordt', deaths: 3, outcome: 'ACTIVE' },
          { name: 'Dancer', deaths: 2, outcome: 'LEFT' },
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Bosses faced' }),
    ).toBeInTheDocument();
    expect(screen.getByText('This stream')).toBeInTheDocument();
    expect(screen.getByText('Iudex Gundyr')).toBeInTheDocument();
    expect(screen.getByText('Killed')).toBeInTheDocument();
    expect(screen.getByText('Fighting')).toBeInTheDocument();
    expect(screen.getByText('Moved on')).toBeInTheDocument();
  });

  it('labels encounters as the last stream outside a current stream window', () => {
    render(
      <StreamEncounters
        currentStreamWindow={null}
        encounters={[{ name: 'Iudex Gundyr', deaths: 6, outcome: 'KILLED' }]}
      />,
    );

    expect(screen.getByText('Last stream')).toBeInTheDocument();
    expect(screen.queryByText('This stream')).not.toBeInTheDocument();
  });
});
