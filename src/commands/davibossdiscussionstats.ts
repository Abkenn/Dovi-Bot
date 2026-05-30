import { Command } from '@sapphire/framework';
import { BOT_GUILDS } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { runCommand } from '../modules/command-runner/run-command';
import { buildCommunityTopicStatsEmbed } from '../modules/community-topics/community-topic.discord';
import { getCommunityTopicStats } from '../modules/community-topics/community-topic.service';

const METADATA = COMMAND_METADATA.DAVI_COMMUNITY_TOPIC_STATS;

export class DaviBossDiscussionStatsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
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
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply }) => {
        const stats = await getCommunityTopicStats(BOT_GUILDS.PROD_ENV);

        if (!stats) {
          return editReply({
            content:
              'Community topic tables are not ready yet. Run the DB migration first.',
          });
        }

        return editReply({
          embeds: [
            buildCommunityTopicStatsEmbed({
              title: 'Prod Boss Discussion Signals',
              stats,
            }),
          ],
        });
      },
    });
  }
}
