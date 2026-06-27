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
import { getPingMeClearKeywordAutocomplete } from '../modules/ping-me/ping-me.service';

type PingMeClearAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
  sourceGuildId: string;
};

export class PingMeClearAutocompleteHandler extends InteractionHandler {
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
    if (interaction.commandName !== COMMAND_METADATA.PING_ME.name) {
      return this.none();
    }

    const focusedOption = interaction.options.getFocused(true);
    const sourceGuildId = interaction.guildId;

    if (
      focusedOption.name !== 'clear' ||
      !sourceGuildId ||
      !isInteractionCommandAccessible(interaction, interaction.commandName)
    ) {
      return this.none();
    }

    return this.some({
      focusedOption,
      sourceGuildId,
    } satisfies PingMeClearAutocompleteParseData);
  }

  public override async run(
    interaction: AutocompleteInteraction,
    { focusedOption, sourceGuildId }: InteractionHandler.ParseResult<this>,
  ) {
    const keywords = await getPingMeClearKeywordAutocomplete({
      userId: interaction.user.id,
      sourceGuildId,
      query: String(focusedOption.value),
    });

    return interaction.respond(
      keywords.map((keyword) => ({
        name: keyword,
        value: keyword,
      })),
    );
  }
}
