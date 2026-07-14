import { render, screen } from '@testing-library/react';
import { History } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatsPageHeader } from './stats-page-header';

describe('StatsPageHeader', () => {
  it('keeps a stable shell around route-specific text', () => {
    render(
      <StatsPageHeader
        eyebrow="Dovi Archived Stats"
        title="Dark Souls III"
        statusIcon={<History aria-hidden="true" />}
        statusLabel="Complete history"
      />,
    );

    expect(screen.getByRole('banner')).toHaveClass(
      'justify-between',
      'sm:pb-3',
    );
    expect(screen.getByText('Dovi Archived Stats')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dark Souls III' })).toHaveClass(
      'sm:text-6xl',
    );
    expect(screen.getByText('Complete history')).toHaveClass(
      'border-primary/40',
    );
  });
});
