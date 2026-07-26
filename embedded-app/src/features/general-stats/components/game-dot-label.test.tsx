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

    expect(screen.getByText('Lies of P')).toHaveAttribute('x', '100');
    expect(screen.getByText('Lies of P')).toHaveAttribute('y', '104');
    expect(document.querySelector('line')).toHaveAttribute('x1', '100');
    expect(document.querySelector('line')).toHaveAttribute('x2', '100');

    rerender(
      <svg aria-hidden="true">
        <GameDotLabel index={0} value="Nine Sols" x={120} y={90} />
      </svg>,
    );
    expect(screen.getByText('Nine Sols')).toHaveAttribute('x', '120');
    expect(document.querySelector('line')).toHaveAttribute('y1', '82');
    expect(document.querySelector('line')).toHaveAttribute('y2', '78');

    rerender(
      <svg aria-hidden="true">
        <GameDotLabel />
      </svg>,
    );
    expect(screen.queryByText('Lies of P')).not.toBeInTheDocument();
  });
});
