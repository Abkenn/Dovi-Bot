import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  reloadActivityWhenAvailable: vi.fn().mockResolvedValue(undefined),
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
  reloadActivityWhenAvailable: dependencies.reloadActivityWhenAvailable,
}));

import { RootErrorState } from './root-error-state';

describe('RootErrorState', () => {
  it('connects the root error UI to deployment recovery', () => {
    render(<RootErrorState />);

    fireEvent.click(screen.getByRole('button'));
    expect(dependencies.reloadActivityWhenAvailable).toHaveBeenCalledWith(
      expect.stringMatching(/^retry-/),
    );
  });

  it('keeps the resting screen when a deployment probe fails', () => {
    dependencies.reloadActivityWhenAvailable.mockRejectedValueOnce(
      new Error('Unavailable'),
    );
    render(<RootErrorState />);

    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });
});
