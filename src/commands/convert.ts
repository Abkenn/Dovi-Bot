import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { runCommand } from '../modules/command-runner/run-command';
import { buildCurrencyConversionMessage } from '../modules/currency-conversion/currency-conversion.discord';
import { UnsupportedCurrencyError } from '../modules/currency-conversion/currency-conversion.errors';
import { convertCurrency } from '../modules/currency-conversion/currency-conversion.service';

const METADATA = COMMAND_METADATA.CONVERT;

export class ConvertCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addNumberOption((option) =>
            option
              .setName('amount')
              .setDescription('Amount to convert')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('from')
              .setDescription('Source currency')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('to')
              .setDescription('Target currency')
              .setRequired(false)
              .setAutocomplete(true),
          ),
      {
        guildIds: [...METADATA.guildIds],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, signal }) => {
        try {
          const conversion = await convertCurrency({
            amount: interaction.options.getNumber('amount', true),
            from: interaction.options.getString('from', true),
            to: interaction.options.getString('to') ?? undefined,
            signal,
          });

          return editReply({
            content: buildCurrencyConversionMessage(conversion),
          });
        } catch (error) {
          if (error instanceof UnsupportedCurrencyError) {
            return editReply({
              content:
                "I don't recognize one of those currencies. Use a valid three-letter currency code.",
            });
          }

          throw error;
        }
      },
    });
  }
}
