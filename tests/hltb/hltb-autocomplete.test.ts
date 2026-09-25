import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getHltbAutocomplete: vi.fn(),
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
  COMMAND_METADATA: { HLTB: { name: 'hltb' } },
}));
vi.mock('../../src/modules/hltb/hltb.service', () => ({
  getHltbAutocomplete: dependencies.getHltbAutocomplete,
}));

import { HltbAutocompleteHandler } from '../../src/interaction-handlers/hltb-autocomplete';

const makeInteraction = ({
  commandName = 'hltb',
  optionName = 'game',
}: {
  commandName?: string;
  optionName?: string;
} = {}) => ({
  commandName,
  options: {
    getFocused: vi.fn().mockReturnValue({ name: optionName, value: 'moon' }),
  },
  respond: vi.fn(),
});

describe('HLTB autocomplete handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.isInteractionCommandAccessible.mockReturnValue(true);
  });

  it('handles only accessible HLTB game autocomplete', () => {
    const handler = new HltbAutocompleteHandler({} as never, {} as never);

    expect(handler.parse(makeInteraction() as never)).toMatchObject({
      type: 'some',
    });
    expect(
      handler.parse(makeInteraction({ commandName: 'help' }) as never),
    ).toEqual({ type: 'none' });
    expect(
      handler.parse(makeInteraction({ optionName: 'other' }) as never),
    ).toEqual({ type: 'none' });
  });

  it('returns suggestions and silently handles lookup failures', async () => {
    const choices = [{ name: 'Moonlit Archive', value: 'Moonlit Archive' }];
    dependencies.getHltbAutocomplete.mockResolvedValueOnce(choices);
    const interaction = makeInteraction();
    const handler = new HltbAutocompleteHandler({} as never, {} as never);
    const parseData = { focusedOption: { name: 'game', value: 'moon' } };

    await handler.run(interaction as never, parseData as never);
    expect(interaction.respond).toHaveBeenLastCalledWith(choices);

    dependencies.getHltbAutocomplete.mockRejectedValueOnce(new Error('slow'));
    await handler.run(interaction as never, parseData as never);
    expect(interaction.respond).toHaveBeenLastCalledWith([]);
  });
});
