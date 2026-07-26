import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  reloadActivity,
  useDeploymentRecovery,
} from './use-deployment-recovery';

describe('useDeploymentRecovery', () => {
  it('reloads the same Activity URL with a deployment cache buster', () => {
    const replace = vi.fn();

    reloadActivity('deploy-2', {
      href: 'https://dovi.test/?guild_id=prod&instance_id=activity',
      replace,
    });

    expect(replace).toHaveBeenCalledWith(
      'https://dovi.test/?guild_id=prod&instance_id=activity&dovi_deployment=deploy-2',
    );
  });

  it('keeps rendering while the server is on the same deployment', () => {
    const reload = vi.fn();
    const { result, rerender } = renderHook(
      ({ version }) => useDeploymentRecovery(version, reload),
      { initialProps: { version: 'deploy-1' } },
    );

    rerender({ version: 'deploy-1' });

    expect(result.current).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('stops the old screen and reloads when the server deployment changes', () => {
    const reload = vi.fn();
    const { result, rerender } = renderHook(
      ({ version }) => useDeploymentRecovery(version, reload),
      { initialProps: { version: 'deploy-1' } },
    );

    rerender({ version: 'deploy-2' });

    expect(result.current).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledWith('deploy-2');
  });
});
