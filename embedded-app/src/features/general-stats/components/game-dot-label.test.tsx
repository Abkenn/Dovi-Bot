import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameDotLabel } from './game-dot-label';

describe('GameDotLabel', () => {
  it('renders a staggered single-line chart label', () => {
    const { rerender } = render(
      <svg aria-hidden="true">
        <GameDotLabel index={1} value="Lies of P" x={100} y={80} />
      </svg>,
    );

    expect(screen.getByText('Lies of P')).toHaveAttribute('x', '112');
    expect(screen.getByText('Lies of P')).toHaveAttribute('y', '104');

    rerender(
      <svg aria-hidden="true">
        <GameDotLabel />
      </svg>,
    );
    expect(screen.queryByText('Lies of P')).not.toBeInTheDocument();
  });
});
