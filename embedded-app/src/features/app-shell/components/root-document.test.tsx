import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  HeadContent: () => <meta data-testid="head-content" />,
  Scripts: () => <div data-testid="scripts" />,
}));

import { RootDocument } from './root-document';

describe('RootDocument', () => {
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
