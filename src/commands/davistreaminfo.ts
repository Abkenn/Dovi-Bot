import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  BOT_GUILDS,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';

export class DaviStreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'davistreaminfo',
      description: 'Shows prod env stream information from staging.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .setDefaultMemberPermissions(ADMIN_COMMAND_PERMISSION),
      {
        guildIds: [...COMMAND_GUILDS.DAVI_STREAM_INFO],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return withCommandLogging({
      interaction,
      commandName: this.name,
      ephemeral: true,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.DAVI_STREAM_INFO),
      run: async ({ editReply }) => {
        const streamInfo = await getStreamInfo(BOT_GUILDS.PROD_ENV);
        const embed = buildStreamInfoEmbed(streamInfo);

        return editReply({
          embeds: [embed],
        });
      },
    });
  }
}
