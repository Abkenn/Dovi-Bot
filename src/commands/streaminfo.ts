import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { runCommand } from '../modules/command-runner/run-command';
import {
  buildStreamInfoEmbed,
  buildStreamReminderButton,
} from '../modules/stream-info/stream-info.discord';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';
import { registerLastStreamInfoMessage } from '../modules/stream-info/stream-info-message-updater.service';

const METADATA = COMMAND_METADATA.STREAM_INFO;

export class StreamInfoCommand extends Command {
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
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        const streamInfo = await getStreamInfo(guildId);
        const reminderButton = buildStreamReminderButton(streamInfo.current);
        const message = await editReply({
          embeds: [buildStreamInfoEmbed(streamInfo)],
          components: reminderButton ? [reminderButton] : [],
        });

        await registerLastStreamInfoMessage({
          guildId,
          channelId: interaction.channelId,
          message,
        });

        return message;
      },
    });
  }
}
