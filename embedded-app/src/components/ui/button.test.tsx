import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  it('renders the default shadcn button and forwards button behavior', () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Open stats</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Open stats' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button');
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('supports alternate variants, sizes, and custom classes', () => {
    render(
      <Button variant="outline" size="sm" className="archive-button">
        Archive
      </Button>,
    );

    expect(screen.getByRole('button')).toHaveClass(
      'border',
      'h-8',
      'archive-button',
    );
    expect(buttonVariants({ variant: 'ghost' })).toContain('hover:bg-accent');
  });
});
