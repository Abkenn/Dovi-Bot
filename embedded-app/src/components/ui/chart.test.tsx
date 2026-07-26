import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartContainer } from './chart';

describe('ChartContainer', () => {
  it('applies shadcn chart tokens and forwards container styling', () => {
    render(
      <ChartContainer
        config={{
          difficulty: { label: 'Difficulty', color: 'red' },
          uncolored: { label: 'Uncolored' },
        }}
        className="test-chart"
        style={{ minHeight: 200 }}
      >
        <div>Chart content</div>
      </ChartContainer>,
    );

    const chart = document.querySelector('[data-slot="chart"]');
    expect(chart).not.toBeNull();
    expect(chart).toHaveClass('test-chart');
    expect(chart).toHaveStyle({
      minHeight: '200px',
      '--color-difficulty': 'red',
    });
  });
});
