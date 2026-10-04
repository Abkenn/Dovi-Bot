import { MessageFlags, MessageFlagsBitField } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/boss-trials/poll/boss-trial.service', () => ({}));

import { buildBossTrialRequesterControls } from '../../src/modules/boss-trials/poll/boss-trial.discord';
import { trackComponentMessage } from '../../src/modules/discord/component-lifecycle';

afterEach(() => vi.useRealTimers());

it('removes expired boss-trial bump controls while preserving the working results control', async () => {
  vi.useFakeTimers();
  const trial = { id: 'cleanup-trial', endsAt: new Date(Date.now() + 60_000) };
  const result = {
    id: 'judge-controls',
    flags: new MessageFlagsBitField(MessageFlags.Ephemeral),
    components: [buildBossTrialRequesterControls(trial)],
    edit: vi.fn(),
    fetch: vi.fn(),
  };
  result.fetch.mockResolvedValue(result);
  trackComponentMessage(result as never);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(result.edit).toHaveBeenCalledWith({
    components: [
      expect.objectContaining({
        components: [
          expect.objectContaining({ label: 'Publish Results Again' }),
        ],
      }),
    ],
  });
  expect(
    buildBossTrialRequesterControls(trial).toJSON().components,
  ).toHaveLength(1);
});
