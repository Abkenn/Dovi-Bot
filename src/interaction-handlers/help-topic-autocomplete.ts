import {
  InteractionHandler,
  InteractionHandlerTypes,
} from '@sapphire/framework';
import type {
  AutocompleteFocusedOption,
  AutocompleteInteraction,
} from 'discord.js';
import { ADMIN_COMMAND_PERMISSION } from '../config/discord-access';
import { isInteractionCommandAccessible } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  getHelpTopicAutocomplete,
  getVisibleHelpCommands,
} from '../modules/help/help.discord';

type HelpTopicAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
};

export class HelpTopicAutocompleteHandler extends InteractionHandler {
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
      interaction.commandName !== COMMAND_METADATA.HELP.name ||
      !isInteractionCommandAccessible(interaction, interaction.commandName)
    ) {
      return this.none();
    }

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name !== 'topic') {
      return this.none();
    }

    return this.some({
      focusedOption,
    } satisfies HelpTopicAutocompleteParseData);
  }

  public override async run(
    interaction: AutocompleteInteraction,
    { focusedOption }: InteractionHandler.ParseResult<this>,
  ) {
    const canManageGuild =
      interaction.memberPermissions?.has(ADMIN_COMMAND_PERMISSION) ?? false;
    const topics = getHelpTopicAutocomplete({
      canManageGuild,
      commands: getVisibleHelpCommands({
        canManageGuild,
        guildId: interaction.guildId,
      }),
      query: String(focusedOption.value),
    });

    return interaction.respond(
      topics.map((topic) => ({
        name: topic.name,
        value: topic.value,
      })),
    );
  }
}
