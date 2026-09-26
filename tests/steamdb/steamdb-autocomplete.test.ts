import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getSteamAutocomplete: vi.fn(),
  isInteractionCommandAccessible: vi.fn(),
}));

vi.mock('@sapphire/framework', () => ({
  InteractionHandler: class InteractionHandler {
    public none() {
      return { type: 'none' };
    }

    public some(value: unknown) {
      return { type: 'some', value };
    }
  },
  InteractionHandlerTypes: { Autocomplete: 'autocomplete' },
}));
vi.mock('../../src/config/discord-command-guards', () => ({
  isInteractionCommandAccessible: dependencies.isInteractionCommandAccessible,
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: { STEAM: { name: 'steam' } },
}));
vi.mock('../../src/modules/steam/steam.service', () => ({
  getSteamAutocomplete: dependencies.getSteamAutocomplete,
}));

import { SteamAutocompleteHandler } from '../../src/interaction-handlers/steam-autocomplete';

const makeInteraction = (commandName = 'steam') => ({
  commandName,
  options: {
    getFocused: vi.fn().mockReturnValue({ name: 'game', value: 'moon' }),
  },
  respond: vi.fn(),
});

describe('Steam autocomplete handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.isInteractionCommandAccessible.mockReturnValue(true);
  });

  it('handles accessible Steam game autocomplete', () => {
    const handler = new SteamAutocompleteHandler({} as never, {} as never);

    expect(handler.parse(makeInteraction() as never)).toMatchObject({
      type: 'some',
    });
    expect(handler.parse(makeInteraction('help') as never)).toEqual({
      type: 'none',
    });
  });

  it('responds with suggestions and hides lookup failures', async () => {
    const choices = [{ name: 'Moonlit Archive', value: 'Moonlit Archive' }];
    dependencies.getSteamAutocomplete.mockResolvedValueOnce(choices);
    const interaction = makeInteraction();
    const handler = new SteamAutocompleteHandler({} as never, {} as never);
    const parseData = { focusedOption: { name: 'game', value: 'moon' } };

    await handler.run(interaction as never, parseData as never);
    expect(interaction.respond).toHaveBeenLastCalledWith(choices);

    dependencies.getSteamAutocomplete.mockRejectedValueOnce(new Error('slow'));
    await handler.run(interaction as never, parseData as never);
    expect(interaction.respond).toHaveBeenLastCalledWith([]);
  });
});
