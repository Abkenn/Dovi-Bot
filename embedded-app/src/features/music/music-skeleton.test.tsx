import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MusicContent } from './music-content';

it('keeps highlight labels visible while only names and play counts load', () => {
  const view = render(<MusicContent data={{ kind: 'loading' }} game={false} />);
  expect(screen.getByText('Most played track')).toBeVisible();
  expect(screen.getByText('Most played game series')).toBeVisible();
  expect(
    view.container.querySelectorAll('[data-slot="skeleton"]'),
  ).toHaveLength(4);
});

it.each([
  true,
  false,
])('shows an accessible skeleton while music loads (searching=%s)', (searching) => {
  const view = render(
    <MusicContent
      data={{ kind: 'loading' }}
      game={false}
      searching={searching}
    />,
  );
  expect(screen.getByRole('status')).toHaveAccessibleName('Loading music');
  expect(
    view.container.querySelectorAll('[data-slot="skeleton"]').length,
  ).toBeGreaterThan(2);
  expect(screen.queryByText('Loading music…')).not.toBeInTheDocument();
});
