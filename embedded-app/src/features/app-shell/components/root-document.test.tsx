import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  HeadContent: () => <meta data-testid="head-content" />,
  Scripts: () => <div data-testid="scripts" />,
}));

import { RootDocument } from './root-document';

describe('RootDocument', () => {
  it('applies the server-selected seasonal theme and clears it when returning to normal', () => {
    const view = render(
      <RootDocument seasonalTheme="halloween">
        <div>Route content</div>
      </RootDocument>,
    );
    expect(document.documentElement).toHaveAttribute(
      'data-seasonal-theme',
      'halloween',
    );
    view.rerender(
      <RootDocument>
        <div>Route content</div>
      </RootDocument>,
    );
    expect(document.documentElement).not.toHaveAttribute('data-seasonal-theme');
  });

  it('renders the SSR document shell around route content', () => {
    render(
      <RootDocument>
        <div>Route content</div>
      </RootDocument>,
    );

    expect(screen.getByText('Route content')).toBeInTheDocument();
    expect(
      document.head.querySelector('[data-testid="head-content"]'),
    ).not.toBeNull();
    expect(screen.getByTestId('scripts')).toBeInTheDocument();
  });
});
