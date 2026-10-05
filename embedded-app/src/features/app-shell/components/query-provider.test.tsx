import { useQueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { QueryProvider } from './query-provider';

it('keeps a cache across rerenders and isolates separate application mounts', () => {
  const capture = vi.fn();
  const Consumer = () => {
    capture(useQueryClient());
    return null;
  };
  const view = render(
    <QueryProvider>
      <Consumer />
    </QueryProvider>,
  );
  const first = capture.mock.calls[0]?.[0];
  view.rerender(
    <QueryProvider>
      <Consumer />
    </QueryProvider>,
  );
  expect(capture.mock.lastCall?.[0]).toBe(first);
  view.unmount();
  render(
    <QueryProvider>
      <Consumer />
    </QueryProvider>,
  );
  expect(capture.mock.lastCall?.[0]).not.toBe(first);
});
