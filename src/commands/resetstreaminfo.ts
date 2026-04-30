import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import {
  COMMAND_TIMEOUT_MS,
  withTimeout,
} from '../modules/command-logging/command-timeout';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import {
  getStreamInfo,
  resetStreamInfo,
} from '../modules/stream-info/stream-info.service';

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
      ephemeral: true,
      run: async () => {
        const guildId = await assertCommandGuildAccess(
          interaction,
          COMMAND_GUILDS.RESET_STREAM_INFO,
        );

        if (!guildId) {
          return;
        }

        await withTimeout(resetStreamInfo(guildId), COMMAND_TIMEOUT_MS);

        const streamInfo = await withTimeout(
          getStreamInfo(guildId),
          COMMAND_TIMEOUT_MS,
        );
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          content: 'Stream info reset.',
          embeds: [embed],
        });
      },
    });
  }
}
