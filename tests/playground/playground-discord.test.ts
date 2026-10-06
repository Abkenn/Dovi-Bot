import { ComponentType } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  buildActivityTrackingReport,
  buildPlaygroundModal,
  buildPlaygroundShowcase,
  formatPlaygroundSubmission,
} from '../../src/modules/playground/playground.discord';

describe('staging modal playground', () => {
  it('builds radio, checkbox group and checkbox controls with valid defaults', () => {
    const modal = buildPlaygroundModal('user-1', 12345).toJSON();
    expect(modal.custom_id).toBe('playground:modal:user-1:12345');
    expect(modal.components).toMatchObject([
      {
        type: ComponentType.Label,
        component: {
          type: ComponentType.RadioGroup,
          custom_id: 'stream-type',
          options: [
            { value: 'game', default: true },
            { value: 'music' },
            { value: 'combined' },
          ],
        },
      },
      {
        type: ComponentType.Label,
        component: {
          type: ComponentType.CheckboxGroup,
          custom_id: 'features',
          min_values: 0,
          max_values: 3,
        },
      },
      {
        type: ComponentType.Label,
        component: { type: ComponentType.Checkbox, custom_id: 'reminders' },
      },
    ]);
    const button = buildPlaygroundShowcase(
      'user-1',
      12345,
    ).components[0]?.toJSON();
    expect(button).toMatchObject({
      components: [{ custom_id: 'playground:open:user-1:12345' }],
    });
  });

  it('reports submitted values including empty optional selections', () => {
    expect(
      formatPlaygroundSubmission({
        streamType: 'music',
        features: ['stats', 'music'],
        reminders: true,
      }),
    ).toContain('Reminders: enabled');
    expect(
      formatPlaygroundSubmission({
        streamType: 'game',
        features: [],
        reminders: false,
      }),
    ).toContain('Features: none');
  });

  it('keeps presence reports bounded and makes pending, empty and stale snapshots clear', () => {
    const input = {
      instanceId: 'instance',
      guildId: 'staging',
      channelId: 'channel',
      launchedByUserId: 'alice',
      target: null,
      registeredAt: 0,
      lastCheckedAt: null,
      expiresAt: 12345,
      status: 'pending',
      participants: [],
      joinedUserIds: [],
      leftUserIds: [],
    } satisfies import('../../src/modules/embedded-app/activity-tracking.types').TrackedActivityInstance;
    const pending = buildActivityTrackingReport([input]);
    expect(pending).toContain('Last successful check: pending');
    expect(pending).toContain('Connected at last check (0): none');
    expect(pending).toContain('Launch target: Stats');
    const occupied = buildActivityTrackingReport([
      {
        ...input,
        status: 'unavailable',
        lastCheckedAt: 10_000,
        participants: Array.from({ length: 12 }, (_, index) => ({
          userId: `user-${index}`,
          connected: true,
          firstSeenAt: 1_000,
          lastSeenAt: 10_000,
        })),
      },
    ]);
    expect(occupied).toContain('Status: unavailable');
    expect(occupied).toContain('snapshots may be stale');
    expect(occupied).toContain('…');
    expect(occupied.length).toBeLessThan(2_000);
  });
});
