import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildShowBossStatsEmbed } from '../modules/boss-encounter-stats/boss/boss-encounter-stats.discord';
import { buildShowGameStatsEmbed } from '../modules/boss-encounter-stats/game/game-encounter-stats.discord';
import {
  getBossView,
  getGameBossDeathRanking,
} from '../modules/bosses/bosses.service';
import { resolveGameStatsGameName } from '../modules/bosses/bosses.utils';
import { runCommand } from '../modules/command-runner/run-command';
import { getDefaultStreamGameName } from '../modules/stream-info/stream-info.service';

const METADATA = COMMAND_METADATA.SHOW_GAME_STATS;
const ALL_BOSS_STATS_OPTIONS = { limit: null } as const;

export class ShowGameStatsCommand extends Command {
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
              .setName('game')
              .setDescription('Game name, defaults to the stream game')
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('boss')
              .setDescription('Optional boss name')
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('results')
              .setDescription('Show the top 10 bosses or every boss')
              .setRequired(false)
              .addChoices(
                { name: 'Top 10', value: 'top10' },
                { name: 'All', value: 'all' },
              ),
          ),
      {
        guildIds: [...METADATA.guildIds],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        const selectedGameName =
          interaction.options.getString('game')?.trim() || null;
        const defaultGameName = selectedGameName
          ? null
          : await getDefaultStreamGameName(guildId);
        const gameName = resolveGameStatsGameName(
          selectedGameName,
          defaultGameName,
        );
        const bossName = interaction.options.getString('boss');
        const results = interaction.options.getString('results') ?? 'top10';

        if (bossName) {
          const boss = await getBossView({
            gameName,
            bossName,
          });

          return editReply({
            embeds: [buildShowBossStatsEmbed(boss)],
          });
        }

        if (results === 'all') {
          return editReply({
            embeds: [
              buildShowGameStatsEmbed(
                await getGameBossDeathRanking(gameName, ALL_BOSS_STATS_OPTIONS),
                ALL_BOSS_STATS_OPTIONS,
              ),
            ],
          });
        }

        return editReply({
          embeds: [
            buildShowGameStatsEmbed(await getGameBossDeathRanking(gameName)),
          ],
        });
      },
    });
  }
}
