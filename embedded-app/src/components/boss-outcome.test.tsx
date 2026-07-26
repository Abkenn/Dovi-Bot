import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BossOutcome } from './boss-outcome';

describe('BossOutcome', () => {
  it.each([
    ['ACTIVE', 'Fighting'],
    ['PAUSED', 'Paused'],
    ['KILLED', 'Killed'],
  ] as const)('renders the %s outcome branch', (outcome, label) => {
    render(<BossOutcome outcome={outcome} />);

    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });
});
