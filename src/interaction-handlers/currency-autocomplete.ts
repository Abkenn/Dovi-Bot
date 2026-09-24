import {
  InteractionHandler,
  InteractionHandlerTypes,
} from '@sapphire/framework';
import type {
  AutocompleteFocusedOption,
  AutocompleteInteraction,
} from 'discord.js';
import { isInteractionCommandAccessible } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { getCurrencyAutocomplete } from '../modules/currency-conversion/currency-conversion.service';

type CurrencyAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
};

export class CurrencyAutocompleteHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Autocomplete,
    });
  }

  public override parse(interaction: AutocompleteInteraction) {
    if (
      interaction.commandName !== COMMAND_METADATA.CONVERT.name ||
      !isInteractionCommandAccessible(interaction, interaction.commandName)
    ) {
      return this.none();
    }

    const focusedOption = interaction.options.getFocused(true);
    if (!['from', 'to'].includes(focusedOption.name)) {
      return this.none();
    }

    return this.some({ focusedOption } satisfies CurrencyAutocompleteParseData);
  }

  public override run(
    interaction: AutocompleteInteraction,
    { focusedOption }: InteractionHandler.ParseResult<this>,
  ) {
    return interaction.respond(
      getCurrencyAutocomplete(String(focusedOption.value)),
    );
  }
}
