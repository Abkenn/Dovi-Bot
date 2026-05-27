import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  withCommandLogging,
} from '../modules/command-logging/with-command-logging';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';
import { resetStreamInfo } from '../modules/stream-info/stream-info.service';

const METADATA = COMMAND_METADATA.RESET_STREAM_INFO;

export class ResetStreamInfoCommand extends Command {
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
          .setDefaultMemberPermissions(ADMIN_COMMAND_PERMISSION),
      {
        guildIds: [...METADATA.guildIds],
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
        assertCommandGuildAccess(interaction, METADATA.guildIds),
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
