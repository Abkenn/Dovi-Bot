import { Events } from 'discord.js';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@sapphire/framework', () => ({
  Listener: class {
    public constructor(
      _context: unknown,
      public options: object,
    ) {}
  },
}));
const handlers = vi.hoisted(() => ({
  handlePlaygroundInteraction: vi.fn(),
  trackInteractionComponentReply: vi.fn(),
}));
vi.mock('../../src/modules/playground/playground.service', () => ({
  handlePlaygroundInteraction: handlers.handlePlaygroundInteraction,
}));
vi.mock('../../src/modules/discord/component-lifecycle', () => ({
  trackInteractionComponentReply: handlers.trackInteractionComponentReply,
}));

import { PlaygroundComponentsListener } from '../../src/listeners/playground-components';

beforeEach(() => vi.clearAllMocks());

it('registers the showcase handler for Discord interaction events', () => {
  const listener = new PlaygroundComponentsListener({} as never, {});
  expect(listener.options).toMatchObject({ event: Events.InteractionCreate });
});

it('tracks component replies after successful and failed playground handling', async () => {
  const error = new Error('Discord unavailable');
  const logger = { error: vi.fn() };
  const listener = { container: { logger } };
  const interaction = { id: 'interaction' };
  await PlaygroundComponentsListener.prototype.run.call(
    listener as never,
    interaction as never,
  );
  expect(
    handlers.trackInteractionComponentReply,
  ).toHaveBeenCalledExactlyOnceWith(interaction);
  handlers.handlePlaygroundInteraction.mockRejectedValueOnce(error);
  await PlaygroundComponentsListener.prototype.run.call(
    listener as never,
    interaction as never,
  );
  expect(logger.error).toHaveBeenCalledWith(
    'Playground interaction failed.',
    error,
  );
  expect(handlers.trackInteractionComponentReply).toHaveBeenCalledTimes(2);
});
