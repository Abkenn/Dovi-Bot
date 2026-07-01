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
import {
  fetchDaviSayChannels,
  getDaviSayChannelAutocomplete,
  getDaviSayTargetGuildId,
} from '../modules/davi-say/davi-say.service';
import type { DaviSayEnvironment } from '../modules/davi-say/davi-say.types';

const isDaviSayEnvironment = (value: string): value is DaviSayEnvironment =>
  value === 'prod' || value === 'staging';

type DaviSayChannelAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
};

export class DaviSayChannelAutocompleteHandler extends InteractionHandler {
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
      interaction.commandName !== COMMAND_METADATA.DAVI_SAY.name ||
      !isInteractionCommandAccessible(interaction, interaction.commandName)
    ) {
      return this.none();
    }

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name !== 'channel') {
      return this.none();
    }

    return this.some({
      focusedOption,
    } satisfies DaviSayChannelAutocompleteParseData);
  }

  public override async run(
    interaction: AutocompleteInteraction,
    { focusedOption }: InteractionHandler.ParseResult<this>,
  ) {
    const environmentOption = interaction.options.getString('env');
    const environment =
      environmentOption && isDaviSayEnvironment(environmentOption)
        ? environmentOption
        : 'prod';

    try {
      const channels = await fetchDaviSayChannels(
        interaction.client,
        getDaviSayTargetGuildId(environment),
      );

      return interaction.respond(
        getDaviSayChannelAutocomplete({
          channels,
          query: String(focusedOption.value),
        }),
      );
    } catch {
      return interaction.respond([]);
    }
  }
}
