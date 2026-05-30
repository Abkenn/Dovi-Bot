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
import { getDefaultStreamGameName } from '../modules/stream-info/stream-info.service';

const BOSS_AUTOCOMPLETE_COMMANDS = new Set([
  'bosstrial',
  'gamediscussionstats',
  'showbossstats',
  'trackbossresume',
  'trackbossstart',
  'updatebossinfo',
  'updategameinfo',
]);
const COMMANDS_WITH_DEFAULT_STREAM_GAME = new Set([
  'trackbossresume',
  'trackbossstart',
  'updatebossinfo',
  'updategameinfo',
]);

type BossAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
};

const getAutocompleteGameName = async (
  interaction: AutocompleteInteraction,
) => {
  const gameName = interaction.options.getString('game');

  if (gameName) {
    return gameName;
  }

  if (
    !interaction.guildId ||
    !COMMANDS_WITH_DEFAULT_STREAM_GAME.has(interaction.commandName)
  ) {
    return null;
  }

  return getDefaultStreamGameName(interaction.guildId);
};

export class BossAutocompleteHandler extends InteractionHandler {
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
    if (!BOSS_AUTOCOMPLETE_COMMANDS.has(interaction.commandName)) {
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
    } satisfies BossAutocompleteParseData);
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
      gameName: await getAutocompleteGameName(interaction),
      query: String(focusedOption.value),
    });

    return interaction.respond(
      bosses.map((boss) => ({ name: boss.name, value: boss.name })),
    );
  }
}
