import { Command } from '@sapphire/framework';
import { COMMAND_GUILDS } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import {
  COMMAND_TIMEOUT_MS,
  withTimeout,
} from '../modules/command-logging/command-timeout';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';

export class StreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'streaminfo',
      description: 'Shows current and next stream information.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
      {
        guildIds: [...COMMAND_GUILDS.STREAM_INFO],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return withCommandLogging({
      interaction,
      commandName: this.name,
      run: async () => {
        const guildId = await assertCommandGuildAccess(
          interaction,
          COMMAND_GUILDS.STREAM_INFO,
        );

        if (!guildId) {
          return;
        }

        const streamInfo = await withTimeout(
          getStreamInfo(guildId),
          COMMAND_TIMEOUT_MS,
        );
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          embeds: [embed],
        });
      },
    });
  }
}
