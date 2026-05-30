import {
  InteractionHandler,
  InteractionHandlerTypes,
} from '@sapphire/framework';
import type {
  AutocompleteFocusedOption,
  AutocompleteInteraction,
} from 'discord.js';
import { getOpenBossTrackingBossAutocomplete } from '../modules/boss-tracking/boss-tracking.service';
import {
  BOSS_TRIAL_BUMP_OPTIONS,
  BOSS_TRIAL_DURATION_OPTIONS,
} from '../modules/boss-trials/boss-trial.config';
import {
  getBossAutocomplete,
  getBossGameAutocomplete,
  toBossAutocompleteValue,
} from '../modules/bosses/bosses.service';
import { getDefaultStreamGameName } from '../modules/stream-info/stream-info.service';

const AUTOCOMPLETE_TIMEOUT_MS = 2_500;

const GAME_OPTION_AUTOCOMPLETE_COMMANDS = new Set([
  'bosstrial',
  'gamediscussionstats',
  'showbossstats',
  'trackbossresume',
  'updatebossinfo',
  'updategameinfo',
]);
const BOSS_OPTION_AUTOCOMPLETE_COMMANDS = new Set([
  'bosstrial',
  'gamediscussionstats',
  'showbossstats',
  'trackbossresume',
  'updatebossinfo',
]);
const BUMP_OPTION_AUTOCOMPLETE_COMMANDS = new Set(['bosstrial']);
const COMMANDS_WITH_DEFAULT_STREAM_GAME = new Set([
  'trackbossresume',
  'updatebossinfo',
  'updategameinfo',
]);

type BossAutocompleteParseData = {
  focusedOption: AutocompleteFocusedOption;
};

type AutocompleteChoice = {
  name: string;
  value: string;
};

const isExpiredAutocompleteResponseError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  [40060, 10062].includes(Number((error as { code?: unknown }).code));

const respondSafely = async (
  interaction: AutocompleteInteraction,
  choices: AutocompleteChoice[],
) => {
  try {
    return await interaction.respond(choices);
  } catch (error) {
    if (isExpiredAutocompleteResponseError(error)) {
      return;
    }

    throw error;
  }
};

const withAutocompleteTimeout = async <TValue>(
  value: Promise<TValue>,
  fallback: TValue,
) =>
  Promise.race([
    value,
    new Promise<TValue>((resolve) => {
      setTimeout(() => resolve(fallback), AUTOCOMPLETE_TIMEOUT_MS);
    }),
  ]);

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
    const focusedOption = interaction.options.getFocused(true);
    const shouldHandle =
      (focusedOption.name === 'game' &&
        GAME_OPTION_AUTOCOMPLETE_COMMANDS.has(interaction.commandName)) ||
      (focusedOption.name === 'boss' &&
        BOSS_OPTION_AUTOCOMPLETE_COMMANDS.has(interaction.commandName)) ||
      (focusedOption.name === 'bump' &&
        BUMP_OPTION_AUTOCOMPLETE_COMMANDS.has(interaction.commandName));

    if (!shouldHandle) {
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
      const games = await withAutocompleteTimeout(
        getBossGameAutocomplete(String(focusedOption.value)),
        [],
      );

      return respondSafely(
        interaction,
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

      return respondSafely(
        interaction,
        bumpOptions.map((option) => ({
          name: option.label,
          value: option.value,
        })),
      );
    }

    if (interaction.commandName === 'trackbossresume') {
      if (!interaction.guildId) {
        return respondSafely(interaction, []);
      }

      const bosses = await withAutocompleteTimeout(
        getOpenBossTrackingBossAutocomplete({
          guildId: interaction.guildId,
          gameName: await getAutocompleteGameName(interaction),
          query: String(focusedOption.value),
        }),
        [],
      );

      return respondSafely(
        interaction,
        bosses.map((boss) => ({
          name: `${boss.gameName} - ${boss.name}`,
          value: boss.name,
        })),
      );
    }

    const gameName = await getAutocompleteGameName(interaction);
    const bosses = await withAutocompleteTimeout(
      getBossAutocomplete({
        gameName,
        query: String(focusedOption.value),
      }),
      [],
    );

    return respondSafely(
      interaction,
      bosses.map((boss) => ({
        name: gameName ? boss.name : `${boss.game.name} - ${boss.name}`,
        value: gameName
          ? boss.name
          : toBossAutocompleteValue({
              gameName: boss.game.name,
              bossName: boss.name,
            }),
      })),
    );
  }
}
