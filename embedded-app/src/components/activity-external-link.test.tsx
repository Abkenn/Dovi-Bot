import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { registerActivityLinkOpener } from '@/lib/activity-links';
import { ActivityExternalLink } from './activity-external-link';

it('uses the connected Activity opener instead of iframe navigation, including modified clicks', () => {
  const open = vi.fn().mockResolvedValue(undefined);
  const unregister = registerActivityLinkOpener(open);
  render(
    <ActivityExternalLink href="https://www.youtube.com/watch?v=video&t=90s">
      Track
    </ActivityExternalLink>,
  );
  fireEvent.click(screen.getByRole('link'), { ctrlKey: true });
  expect(open).toHaveBeenCalledWith(
    'https://www.youtube.com/watch?v=video&t=90s',
  );
  unregister();
});

it('keeps browser preview links native and reports SDK errors with a retryable link', async () => {
  render(
    <ActivityExternalLink href="https://www.youtube.com/watch?v=video">
      Track
    </ActivityExternalLink>,
  );
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=video',
  );
  const unregister = registerActivityLinkOpener(
    vi.fn().mockRejectedValue(new Error('Unavailable')),
  );
  fireEvent.click(screen.getByRole('link'));
  await screen.findByRole('alert');
  expect(screen.getByRole('link')).toBeEnabled();
  unregister();
});
