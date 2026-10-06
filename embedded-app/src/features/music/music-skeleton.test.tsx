import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MusicContent } from './music-content';

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
