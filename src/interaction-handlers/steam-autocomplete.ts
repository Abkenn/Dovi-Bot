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
import { getSteamAutocomplete } from '../modules/steam/steam.service';

type SteamAutocompleteParseData = { focusedOption: AutocompleteFocusedOption };

export class SteamAutocompleteHandler extends InteractionHandler {
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
      interaction.commandName !== COMMAND_METADATA.STEAM.name ||
      !isInteractionCommandAccessible(interaction, interaction.commandName)
    ) {
      return this.none();
    }

    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== 'game') {
      return this.none();
    }

    return this.some({ focusedOption } satisfies SteamAutocompleteParseData);
  }

  public override async run(
    interaction: AutocompleteInteraction,
    { focusedOption }: InteractionHandler.ParseResult<this>,
  ) {
    try {
      const choices = await getSteamAutocomplete(
        String(focusedOption.value),
        AbortSignal.timeout(2_500),
      );
      return interaction.respond(choices);
    } catch {
      return interaction.respond([]);
    }
  }
}
