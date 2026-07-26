import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrendExplanation } from './trend-explanation';

describe('TrendExplanation', () => {
  it('explains the hovered regression line', () => {
    render(
      <TrendExplanation
        description="Attempts and time move together."
        x={20}
        y={30}
      />,
    );

    expect(screen.getByText('Difficulty trend')).toBeInTheDocument();
    expect(
      screen.getByText('Attempts and time move together.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Difficulty trend').parentElement).toHaveStyle({
      left: '20px',
      top: '30px',
    });
  });
});
