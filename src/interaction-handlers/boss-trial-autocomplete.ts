import {
  InteractionHandler,
  InteractionHandlerTypes,
} from '@sapphire/framework';
import type {
  AutocompleteFocusedOption,
  AutocompleteInteraction,
} from 'discord.js';
import {
  getBossStatsBossAutocomplete,
  getBossStatsGameAutocomplete,
} from '../modules/boss-stats/boss-stats.service';

const BOSS_STATS_AUTOCOMPLETE_COMMANDS = new Set([
  'bosstrial',
  'showbossstats',
]);

type BossTrialAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
};

export class BossTrialAutocompleteHandler extends InteractionHandler {
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
    if (!BOSS_STATS_AUTOCOMPLETE_COMMANDS.has(interaction.commandName)) {
      return this.none();
    }

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name !== 'game' && focusedOption.name !== 'boss') {
      return this.none();
    }

    return this.some({
      focusedOption,
    } satisfies BossTrialAutocompleteParseData);
  }

  public override async run(
    interaction: AutocompleteInteraction,
    { focusedOption }: InteractionHandler.ParseResult<this>,
  ) {
    if (focusedOption.name === 'game') {
      const games = await getBossStatsGameAutocomplete(
        String(focusedOption.value),
      );

      return interaction.respond(
        games.map((game) => ({ name: game.name, value: game.name })),
      );
    }

    const bosses = await getBossStatsBossAutocomplete({
      gameName: interaction.options.getString('game'),
      query: String(focusedOption.value),
    });

    return interaction.respond(
      bosses.map((boss) => ({ name: boss.name, value: boss.name })),
    );
  }
}
