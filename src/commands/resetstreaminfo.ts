import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import {
  EPHEMERAL_COMMAND_REPLY,
  withCommandLogging,
} from '../modules/command-logging/with-command-logging';
import { getStreamInfoEmbed } from '../modules/stream-info/get-stream-info-embed';
import { resetStreamInfo } from '../modules/stream-info/stream-info.service';

export class ResetStreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'resetstreaminfo',
      description:
        'Resets stream override (type, game, title, etc.) for current/next.',
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
        guildIds: [...COMMAND_GUILDS.RESET_STREAM_INFO],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return withCommandLogging({
      interaction,
      commandName: this.name,
      deferReplyOptions: EPHEMERAL_COMMAND_REPLY,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.RESET_STREAM_INFO),
      run: async ({ editReply, preflight: guildId }) => {
        await resetStreamInfo(guildId);

        return editReply({
          content: 'Stream info reset.',
          embeds: [await getStreamInfoEmbed(guildId)],
        });
      },
    });
  }
}
