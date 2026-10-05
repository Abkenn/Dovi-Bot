import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { expect, it } from 'vitest';
import { Separator } from './separator';

it('keeps decorative separators out of the accessibility tree', () => {
  const { container } = render(<Separator />);
  expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  expect(container.firstChild).toHaveAttribute('data-slot', 'separator');
  expect(container.firstChild).toHaveAttribute(
    'data-orientation',
    'horizontal',
  );
});

it('preserves semantic orientation, custom styling, and refs', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <Separator
      decorative={false}
      orientation="vertical"
      className="custom"
      ref={ref}
    />,
  );
  const separator = screen.getByRole('separator');
  expect(separator).toHaveAttribute('aria-orientation', 'vertical');
  expect(separator).toHaveClass('custom');
  expect(ref.current).toBe(separator);
});
