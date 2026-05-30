import {
  InteractionHandler,
  InteractionHandlerTypes,
} from '@sapphire/framework';
import type {
  AutocompleteFocusedOption,
  AutocompleteInteraction,
} from 'discord.js';
import {
  BOSS_TRIAL_BUMP_OPTIONS,
  BOSS_TRIAL_DURATION_OPTIONS,
} from '../modules/boss-trials/boss-trial.config';
import {
  getBossAutocomplete,
  getBossGameAutocomplete,
} from '../modules/bosses/bosses.service';

const BOSS_STATS_AUTOCOMPLETE_COMMANDS = new Set([
  'bosstrial',
  'gamediscussionstats',
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

    if (
      focusedOption.name !== 'game' &&
      focusedOption.name !== 'boss' &&
      focusedOption.name !== 'bump'
    ) {
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
      const games = await getBossGameAutocomplete(String(focusedOption.value));

      return interaction.respond(
        games.map((game) => ({ name: game.name, value: game.name })),
      );
    }

    if (focusedOption.name === 'bump') {
      const duration = interaction.options.getString('duration');
      const bumpOptions = [
        BOSS_TRIAL_BUMP_OPTIONS.DEFAULT,
        ...(duration === BOSS_TRIAL_DURATION_OPTIONS.ONE_DAY.value
          ? [BOSS_TRIAL_BUMP_OPTIONS.MID_POLL_ONLY]
          : []),
        BOSS_TRIAL_BUMP_OPTIONS.NONE,
      ];

      return interaction.respond(
        bumpOptions.map((option) => ({
          name: option.label,
          value: option.value,
        })),
      );
    }

    const bosses = await getBossAutocomplete({
      gameName: interaction.options.getString('game'),
      query: String(focusedOption.value),
    });

    return interaction.respond(
      bosses.map((boss) => ({ name: boss.name, value: boss.name })),
    );
  }
}
