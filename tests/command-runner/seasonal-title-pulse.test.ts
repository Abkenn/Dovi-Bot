import { ComponentType } from 'discord.js';
import { expect, it } from 'vitest';
import {
  getSeasonalTitlePulse,
  updateSeasonalEffectComponents,
} from '../../src/modules/command-runner/seasonal-message-effects.discord';

const pulse = {
  visibleMs: 8000,
  minIntervalMs: 30000,
  maxIntervalMs: 90000,
  lifetimeMs: 1800000,
};
const eye = '<a:eye:1558676165785419866>';

it('shows brief title eyes separated by deterministic 30–90 second gaps', () => {
  let start = 0;
  for (let index = 0; index < 20; index++) {
    expect(getSeasonalTitlePulse('message', start, pulse).visible).toBe(true);
    const hidden = getSeasonalTitlePulse('message', start + 8000, pulse);
    expect(hidden.visible).toBe(false);
    expect(hidden.nextChangeMs - start).toBeGreaterThanOrEqual(30000);
    expect(hidden.nextChangeMs - start).toBeLessThanOrEqual(90000);
    start = hidden.nextChangeMs;
  }
});

it('removes and re-adds only the title eye while keeping its seasonal accent and text', () => {
  const original = [
    {
      type: ComponentType.Container as const,
      accent_color: 0x8b0000,
      components: [
        {
          type: ComponentType.TextDisplay as const,
          content: `# ${eye} Stream Info`,
        },
      ],
    },
  ];
  const hidden = updateSeasonalEffectComponents(
    original,
    [],
    eye,
    false,
    false,
    false,
  );
  expect(hidden).toMatchObject([
    { accent_color: 0x8b0000, components: [{ content: '# Stream Info' }] },
  ]);
  expect(
    updateSeasonalEffectComponents(hidden, [], eye, false, false, true),
  ).toEqual(original);
});
