import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildShowBossStatsEmbed } from '../modules/boss-encounter-stats/boss/boss-encounter-stats.discord';
import { buildShowGameStatsEmbed } from '../modules/boss-encounter-stats/game/game-encounter-stats.discord';
import {
  getBossView,
  getGameBossDeathRanking,
  isGameStatsAllBossesValue,
} from '../modules/bosses/bosses.service';
import { runCommand } from '../modules/command-runner/run-command';

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
              .setDescription('Game name')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('boss')
              .setDescription('Optional boss name')
              .setRequired(false)
              .setAutocomplete(true),
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
      run: async ({ editReply }) => {
        const gameName = interaction.options.getString('game', true);
        const bossName = interaction.options.getString('boss');

        if (isGameStatsAllBossesValue(bossName)) {
          return editReply({
            embeds: [
              buildShowGameStatsEmbed(
                await getGameBossDeathRanking(gameName, ALL_BOSS_STATS_OPTIONS),
                ALL_BOSS_STATS_OPTIONS,
              ),
            ],
          });
        }

        if (bossName) {
          const boss = await getBossView({
            gameName,
            bossName,
          });

          return editReply({
            embeds: [buildShowBossStatsEmbed(boss)],
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
