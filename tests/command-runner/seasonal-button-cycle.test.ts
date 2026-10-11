import {
  type APIActionRowComponent,
  type APIButtonComponent,
  ComponentType,
} from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  getSeasonalActivityButtons,
  getSeasonalButtonCycle,
  preserveSeasonalButtonEmoji,
} from '../../src/modules/command-runner/seasonal-message-effects.discord';

const eye = '<a:eye:1558676165785419866>';
const row = (page: number): APIActionRowComponent<APIButtonComponent> => ({
  type: ComponentType.ActionRow as const,
  components: [
    {
      type: ComponentType.Button as const,
      style: 2 as const,
      custom_id: `music-page:session:${page}`,
      label: 'Back',
    },
    {
      type: ComponentType.Button as const,
      style: 2 as const,
      custom_id: `music-page:session:${page + 1}`,
      label: 'Next',
    },
    {
      type: ComponentType.Button as const,
      style: 2 as const,
      custom_id: 'embedded-app-stats:music',
      label: 'Music Stats',
      emoji: { name: '🎵' },
    },
  ],
});

describe('seasonal button cycle', () => {
  it('preserves eyes when pagination changes button target IDs', () => {
    const previous = row(0);
    const back = previous.components[0];
    if (!back || !('custom_id' in back)) throw new Error('Missing Back button');
    previous.components[0] = {
      ...back,
      emoji: { id: '1558676165785419866', name: 'eye' },
    };
    expect(
      preserveSeasonalButtonEmoji({ components: [row(1)] }, [previous], eye)
        .components,
    ).toMatchObject([
      {
        components: [
          {
            custom_id: 'music-page:session:1',
            emoji: { id: '1558676165785419866' },
          },
          {},
          { emoji: { name: '🎵' } },
        ],
      },
    ]);
  });
  it('varies between one or two eyes and short quiet phases, consistently after restart', () => {
    const buttons = getSeasonalActivityButtons([row(0)]);
    expect(buttons).toHaveLength(3);
    const phases = Array.from({ length: 80 }, (_, phase) =>
      getSeasonalButtonCycle('message', buttons, phase),
    );
    expect(phases).toContainEqual([]);
    expect(phases.some((phase) => phase.length === 2)).toBe(true);
    expect(phases.filter((phase) => phase.length > 0).length).toBeGreaterThan(
      60,
    );
    expect(
      phases.every(
        (phase, index) =>
          phase.length ||
          phases[index + 1]?.length ||
          index === phases.length - 1,
      ),
    ).toBe(true);
    expect(getSeasonalButtonCycle('message', buttons, 5)).toEqual(phases[5]);
  });
});
