import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION, BOT_GUILDS } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';
import { resetStreamInfo } from '../modules/stream-info/stream-info.service';

const METADATA = COMMAND_METADATA.DAVI_RESET_STREAM_INFO;

export class DaviResetStreamInfoCommand extends Command {
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
    return runCommand({
      interaction,
      commandName: this.name,
      deferReplyOptions: EPHEMERAL_COMMAND_REPLY,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply }) => {
        const targetGuildId = BOT_GUILDS.PROD_ENV;

        await resetStreamInfo(targetGuildId);

        return editReply({
          content: 'Prod env stream override reset.',
          embeds: [await getStreamInfoEmbed(targetGuildId)],
        });
      },
    });
  }
}
