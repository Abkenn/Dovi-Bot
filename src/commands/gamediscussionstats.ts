import { Command } from '@sapphire/framework';
import { BOT_GUILDS } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { getBossView } from '../modules/bosses/bosses.service';
import { runCommand } from '../modules/command-runner/run-command';
import {
  buildCommunityTopicBossDiscussionEmbed,
  buildCommunityTopicGameDiscussionEmbed,
} from '../modules/community-topics/community-topic.discord';
import {
  getCommunityTopicBossDiscussionStats,
  getCommunityTopicGameDiscussionStats,
} from '../modules/community-topics/community-topic.service';

const METADATA = COMMAND_METADATA.GAME_DISCUSSION_STATS;

export class GameDiscussionStatsCommand extends Command {
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
              .setDescription('Boss name')
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
        const targetGuildId =
          interaction.guildId === BOT_GUILDS.STAGING_ENV
            ? BOT_GUILDS.PROD_ENV
            : interaction.guildId;

        if (!targetGuildId) {
          throw new Error('This command can only be used in a server.');
        }

        if (!bossName) {
          const stats = await getCommunityTopicGameDiscussionStats({
            guildId: targetGuildId,
            gameName,
          });

          if (!stats) {
            return editReply({
              content:
                'Community topic tables are not ready yet. Run the DB migration first.',
            });
          }

          return editReply({
            embeds: [buildCommunityTopicGameDiscussionEmbed({ stats })],
          });
        }

        const boss = await getBossView({
          gameName,
          bossName,
        });
        const stats = await getCommunityTopicBossDiscussionStats({
          guildId: targetGuildId,
          gameName: boss.game.name,
          bossName: boss.name,
        });

        if (!stats) {
          return editReply({
            content:
              'Community topic tables are not ready yet. Run the DB migration first.',
          });
        }

        return editReply({
          embeds: [buildCommunityTopicBossDiscussionEmbed({ stats })],
        });
      },
    });
  }
}
