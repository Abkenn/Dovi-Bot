import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getCurrencyAutocomplete: vi.fn(),
  isInteractionCommandAccessible: vi.fn(),
}));

vi.mock('@sapphire/framework', () => ({
  InteractionHandler: class InteractionHandler {
    public constructor(_context: unknown, options: Record<string, unknown>) {
      Object.assign(this, options);
    }

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
  COMMAND_METADATA: { CONVERT: { name: 'convert' } },
}));
vi.mock(
  '../../src/modules/currency-conversion/currency-conversion.service',
  () => ({ getCurrencyAutocomplete: dependencies.getCurrencyAutocomplete }),
);

import { CurrencyAutocompleteHandler } from '../../src/interaction-handlers/currency-autocomplete';

const makeInteraction = ({
  commandName = 'convert',
  optionName = 'from',
  value = 'yen',
}: {
  commandName?: string;
  optionName?: string;
  value?: string;
} = {}) => ({
  commandName,
  options: {
    getFocused: vi.fn().mockReturnValue({ name: optionName, value }),
  },
  respond: vi.fn(),
});

describe('currency autocomplete handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.isInteractionCommandAccessible.mockReturnValue(true);
  });

  it('accepts source and target currency options for /convert', () => {
    const handler = new CurrencyAutocompleteHandler({} as never, {} as never);

    expect(handler.parse(makeInteraction() as never)).toMatchObject({
      type: 'some',
      value: { focusedOption: { name: 'from', value: 'yen' } },
    });
    expect(
      handler.parse(makeInteraction({ optionName: 'to' }) as never),
    ).toMatchObject({ type: 'some' });
  });

  it('ignores other commands and options', () => {
    const handler = new CurrencyAutocompleteHandler({} as never, {} as never);

    expect(
      handler.parse(makeInteraction({ commandName: 'help' }) as never),
    ).toEqual({ type: 'none' });
    expect(
      handler.parse(makeInteraction({ optionName: 'amount' }) as never),
    ).toEqual({ type: 'none' });
  });

  it('responds with matching currency choices', async () => {
    const choices = [{ name: 'JPY - Japanese Yen', value: 'JPY' }];
    dependencies.getCurrencyAutocomplete.mockReturnValue(choices);
    const interaction = makeInteraction();
    const handler = new CurrencyAutocompleteHandler({} as never, {} as never);

    await handler.run(
      interaction as never,
      {
        focusedOption: { name: 'from', value: 'yen' },
      } as never,
    );

    expect(dependencies.getCurrencyAutocomplete).toHaveBeenCalledWith('yen');
    expect(interaction.respond).toHaveBeenCalledWith(choices);
  });
});
