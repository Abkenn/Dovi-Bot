import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { runCommand } from '../modules/command-runner/run-command';
import {
  buildMusicGamePages,
  buildMusicSearchReply,
} from '../modules/music/music.discord';
import { buildMusicActivityButton } from '../modules/music/music-activity.discord';
import { createMusicSearchPagination } from '../modules/music/music-pagination';
import { searchMusicCatalog } from '../modules/music/music-search.service';

const METADATA = COMMAND_METADATA.MUSIC_SEARCH;

export class MusicSearchCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option
              .setName('query')
              .setDescription(
                'Track name by default; enter a game name when game is Yes',
              )
              .setRequired(true)
              .setMinLength(2)
              .setMaxLength(100),
          )
          .addStringOption((option) =>
            option
              .setName('game')
              .setDescription(
                'Yes: list tracks from a game. No or omitted: search a track name.',
              )
              .addChoices(
                { name: 'Yes', value: 'yes' },
                { name: 'No', value: 'no' },
              ),
          ),
      { guildIds: [...METADATA.guildIds] },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply }) => {
        const game = interaction.options.getString('game') === 'yes';
        const query = interaction.options.getString('query', true);
        const results = await searchMusicCatalog(query, { game });
        if (game && results?.length) {
          const gameResults = results.filter(
            (result) => 'offsetSeconds' in result,
          );
          return editReply(
            createMusicSearchPagination({
              pages: buildMusicGamePages(gameResults, query),
              guildId: interaction.guildId,
              activityQuery: query,
            }),
          );
        }
        const activity = buildMusicActivityButton(interaction.guildId, {
          game,
          query,
        });
        return editReply({
          ...buildMusicSearchReply(results, { game, query }),
          components: activity ? [activity] : [],
        });
      },
    });
  }
}
