import {
  InteractionHandler,
  InteractionHandlerTypes,
} from '@sapphire/framework';
import type {
  AutocompleteFocusedOption,
  AutocompleteInteraction,
} from 'discord.js';
import { BOT_GUILDS } from '../config/discord-access';
import { isInteractionCommandAccessible } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { getStreamInfoDayAutocomplete } from '../modules/stream-info/stream-info.service';

const STREAM_INFO_DAY_AUTOCOMPLETE_COMMANDS = new Set<string>([
  COMMAND_METADATA.SET_STREAM_INFO.name,
  COMMAND_METADATA.DAVI_SET_STREAM_INFO.name,
]);

type StreamInfoDayAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
};

export class StreamInfoDayAutocompleteHandler extends InteractionHandler {
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
      !STREAM_INFO_DAY_AUTOCOMPLETE_COMMANDS.has(interaction.commandName) ||
      !isInteractionCommandAccessible(interaction, interaction.commandName)
    ) {
      return this.none();
    }

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name !== 'day') {
      return this.none();
    }

    return this.some({
      focusedOption,
    } satisfies StreamInfoDayAutocompleteParseData);
  }

  public override async run(
    interaction: AutocompleteInteraction,
    { focusedOption }: InteractionHandler.ParseResult<this>,
  ) {
    const targetGuildId =
      interaction.commandName === COMMAND_METADATA.DAVI_SET_STREAM_INFO.name
        ? BOT_GUILDS.PROD_ENV
        : interaction.guildId;

    if (!targetGuildId) {
      return interaction.respond([]);
    }

    const days = await getStreamInfoDayAutocomplete({
      guildId: targetGuildId,
      query: String(focusedOption.value),
    });

    return interaction.respond(days);
  }
}
