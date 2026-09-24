import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  assertCommandAccess: vi.fn(),
  buildCurrencyConversionMessage: vi.fn().mockReturnValue('converted'),
  convertCurrency: vi.fn(),
  editReply: vi.fn(),
  runCommand: vi.fn(),
  UnsupportedCurrencyError: class UnsupportedCurrencyError extends Error {},
}));

vi.mock('@sapphire/framework', () => ({
  Command: class Command {
    public constructor(_context: unknown, options: Record<string, unknown>) {
      Object.assign(this, options);
    }
  },
}));
vi.mock('../../src/config/discord-command-guards', () => ({
  assertCommandAccess: dependencies.assertCommandAccess,
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: {
    CONVERT: {
      name: 'convert',
      description: 'Converts currencies.',
      guildIds: ['staging-guild', 'production-guild'],
    },
  },
}));
vi.mock('../../src/modules/command-runner/run-command', () => ({
  runCommand: dependencies.runCommand,
}));
vi.mock(
  '../../src/modules/currency-conversion/currency-conversion.service',
  () => ({ convertCurrency: dependencies.convertCurrency }),
);
vi.mock(
  '../../src/modules/currency-conversion/currency-conversion.discord',
  () => ({
    buildCurrencyConversionMessage: dependencies.buildCurrencyConversionMessage,
  }),
);
vi.mock(
  '../../src/modules/currency-conversion/currency-conversion.errors',
  () => ({ UnsupportedCurrencyError: dependencies.UnsupportedCurrencyError }),
);

import { ConvertCommand } from '../../src/commands/convert';

const makeInteraction = ({
  amount = 50,
  from = 'gbp',
  to = null,
}: {
  amount?: number;
  from?: string;
  to?: string | null;
} = {}) => ({
  options: {
    getNumber: vi.fn().mockReturnValue(amount),
    getString: vi.fn((name: string) => (name === 'from' ? from : to)),
  },
});

describe('/convert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.runCommand.mockImplementation(async (options) => {
      await options.beforeDefer?.();
      return options.run({
        editReply: dependencies.editReply,
        preflight: 'production-guild',
        signal: new AbortController().signal,
      });
    });
    dependencies.convertCurrency.mockResolvedValue({
      amount: 50,
      convertedAmount: 59,
      date: '2026-09-24',
      from: 'GBP',
      rate: 1.18,
      to: 'USD',
    });
  });

  it('registers amount and source as required with an optional target', () => {
    const options = new Map<
      string,
      { setRequired: ReturnType<typeof vi.fn> }
    >();
    const makeOption = () => {
      const option = {
        setName: vi.fn((name: string) => {
          options.set(name, option);
          return option;
        }),
        setDescription: vi.fn().mockReturnThis(),
        setRequired: vi.fn().mockReturnThis(),
        setAutocomplete: vi.fn().mockReturnThis(),
      };
      return option;
    };
    const builder = {
      setName: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      addNumberOption: vi.fn((configure) => {
        configure(makeOption());
        return builder;
      }),
      addStringOption: vi.fn((configure) => {
        configure(makeOption());
        return builder;
      }),
    };
    const registerChatInputCommand = vi.fn((configure) => configure(builder));
    const command = new ConvertCommand({} as never, {});

    command.registerApplicationCommands({ registerChatInputCommand } as never);

    expect(options.get('amount')?.setRequired).toHaveBeenCalledWith(true);
    expect(options.get('from')?.setRequired).toHaveBeenCalledWith(true);
    expect(options.get('to')?.setRequired).toHaveBeenCalledWith(false);
  });

  it('converts to USD when the target is omitted', async () => {
    const interaction = makeInteraction();

    await ConvertCommand.prototype.chatInputRun.call(
      { name: 'convert' },
      interaction as never,
    );

    expect(dependencies.convertCurrency).toHaveBeenCalledWith({
      amount: 50,
      from: 'gbp',
      signal: expect.any(AbortSignal),
      to: undefined,
    });
    expect(dependencies.editReply).toHaveBeenCalledWith({
      content: 'converted',
    });
    expect(dependencies.assertCommandAccess).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ name: 'convert' }),
    );
  });

  it('explains unsupported currencies', async () => {
    dependencies.convertCurrency.mockRejectedValue(
      new dependencies.UnsupportedCurrencyError(),
    );

    await ConvertCommand.prototype.chatInputRun.call(
      { name: 'convert' },
      makeInteraction({ from: 'gold' }) as never,
    );

    expect(dependencies.editReply).toHaveBeenCalledWith({
      content:
        "I don't recognize one of those currencies. Use a valid three-letter currency code.",
    });
  });

  it('lets unexpected service errors reach the command runner', async () => {
    dependencies.convertCurrency.mockRejectedValue(new Error('API offline'));

    await expect(
      ConvertCommand.prototype.chatInputRun.call(
        { name: 'convert' },
        makeInteraction() as never,
      ),
    ).rejects.toThrow('API offline');
  });
});
