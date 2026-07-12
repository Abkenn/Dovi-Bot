import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityErrorState, ActivityLoadingState } from './activity-state';

describe('Activity states', () => {
  it('renders an accessible loading state', () => {
    render(<ActivityLoadingState />);
    expect(screen.getByText('Waking up live stats…')).toBeInTheDocument();
  });

  it('renders a loader error', () => {
    render(<ActivityErrorState message="Database unavailable" />);
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
  });
});
