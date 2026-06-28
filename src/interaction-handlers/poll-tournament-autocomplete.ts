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
  getManageableOptionAutocomplete,
  getManageablePollAutocomplete,
  getNominatingPollAutocomplete,
} from '../modules/poll-tournaments/poll-tournament.service';

type PollAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
  kind: 'NOMINATE' | 'START' | 'MANAGE';
};

export class PollTournamentAutocompleteHandler extends InteractionHandler {
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
    const focusedOption = interaction.options.getFocused(true);

    if (
      interaction.commandName === COMMAND_METADATA.POLL_MANAGE.name &&
      !interaction.guildId &&
      ['poll', 'remove'].includes(focusedOption.name)
    ) {
      return this.some({
        focusedOption,
        kind: 'MANAGE',
      } satisfies PollAutocompleteParseData);
    }

    let kind: PollAutocompleteParseData['kind'] | null = null;

    if (interaction.commandName === COMMAND_METADATA.POLL_NOMINATE.name) {
      kind = 'NOMINATE';
    }

    if (interaction.commandName === COMMAND_METADATA.POLL_START.name) {
      kind = 'START';
    }

    if (
      !kind ||
      focusedOption.name !== 'poll' ||
      !interaction.guildId ||
      !isInteractionCommandAccessible(interaction, interaction.commandName)
    ) {
      return this.none();
    }

    return this.some({
      focusedOption,
      kind,
    } satisfies PollAutocompleteParseData);
  }

  public override async run(
    interaction: AutocompleteInteraction,
    { focusedOption, kind }: InteractionHandler.ParseResult<this>,
  ) {
    const query = String(focusedOption.value);

    if (kind === 'MANAGE') {
      const choices =
        focusedOption.name === 'poll'
          ? await getManageablePollAutocomplete({
              userId: interaction.user.id,
              query,
            })
          : await getManageableOptionAutocomplete({
              userId: interaction.user.id,
              tournamentId: interaction.options.getString('poll'),
              query,
            });

      return interaction.respond(choices);
    }

    return interaction.respond(
      await getNominatingPollAutocomplete({
        guildId: interaction.guildId ?? '',
        userId: interaction.user.id,
        onlyHosted: kind === 'START',
        query,
      }),
    );
  }
}
