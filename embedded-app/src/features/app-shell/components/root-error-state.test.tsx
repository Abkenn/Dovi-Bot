import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  reloadActivity: vi.fn(),
}));

vi.mock('@/components/activity-state', () => ({
  ActivityErrorState: ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry: () => void;
  }) => (
    <button type="button" onClick={onRetry}>
      {message}
    </button>
  ),
}));
vi.mock('@/hooks/use-deployment-recovery', () => ({
  reloadActivity: dependencies.reloadActivity,
}));

import { RootErrorState } from './root-error-state';

describe('RootErrorState', () => {
  it('connects the root error UI to deployment recovery', () => {
    render(<RootErrorState />);

    fireEvent.click(screen.getByRole('button'));
    expect(dependencies.reloadActivity).toHaveBeenCalledWith(
      expect.stringMatching(/^retry-/),
    );
  });
});
