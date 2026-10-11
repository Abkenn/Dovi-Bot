import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SeasonalPageTransition } from './seasonal-page-transition';

describe('seasonal page transitions', () => {
  it('keeps the page mounted during updates and changes it only on navigation', () => {
    const view = render(
      <SeasonalPageTransition enabled page="/music">
        <input aria-label="Search" defaultValue="Dark Souls" />
      </SeasonalPageTransition>,
    );
    const input = screen.getByRole('textbox');
    view.rerender(
      <SeasonalPageTransition enabled page="/music">
        <input aria-label="Search" defaultValue="Updated" />
      </SeasonalPageTransition>,
    );
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveValue('Dark Souls');
    view.rerender(
      <SeasonalPageTransition enabled page="/stats">
        <input aria-label="Search" defaultValue="Updated" />
      </SeasonalPageTransition>,
    );
    expect(screen.getByRole('textbox')).not.toBe(input);
  });

  it('provides the faint static filter only for Halloween', () => {
    const view = render(
      <SeasonalPageTransition enabled page="/music">
        Music
      </SeasonalPageTransition>,
    );
    expect(document.getElementById('seasonal-screen-static')).not.toBeNull();
    view.rerender(
      <SeasonalPageTransition enabled={false} page="/music">
        Music
      </SeasonalPageTransition>,
    );
    expect(document.getElementById('seasonal-screen-static')).toBeNull();
    expect(screen.getByText('Music')).toBeInTheDocument();
  });
});
