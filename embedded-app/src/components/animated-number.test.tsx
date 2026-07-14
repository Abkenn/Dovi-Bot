import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnimatedNumber } from './animated-number';

describe('AnimatedNumber', () => {
  it('exposes the final value immediately while animating the visible number', () => {
    render(
      <AnimatedNumber
        value={178}
        className="text-xl"
        cacheKey="test:first-visit"
      />,
    );

    expect(screen.getByLabelText('178')).toHaveClass('text-xl');
    expect(screen.getByLabelText('178')).toHaveTextContent('0');
    expect(screen.getByLabelText('178')).toHaveAttribute(
      'data-animation-visit',
      'first',
    );
  });
});
