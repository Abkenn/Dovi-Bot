import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { buildEmbeddedAppStatsButton } from '../modules/embedded-app/embedded-app-stats.discord';
import {
  buildStreamInfoEmbed,
  buildStreamReminderButton,
} from '../modules/stream-info/stream-info.discord';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';
import { registerLastStreamInfoMessage } from '../modules/stream-info/stream-info-message-updater.service';
import { getStreamReminderOccurrence } from '../modules/stream-info/stream-reminder.utils';

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
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addBooleanOption((option) =>
            option
              .setName('private')
              .setDescription('Only you can see the response')
              .setRequired(false),
          ),
      {
        guildIds: [...METADATA.guildIds],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const isPrivate = interaction.options.getBoolean('private') ?? false;

    return runCommand({
      interaction,
      commandName: this.name,
      deferReplyOptions: isPrivate ? EPHEMERAL_COMMAND_REPLY : {},
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        const streamInfo = await getStreamInfo(guildId);
        const reminderButton = buildStreamReminderButton(
          getStreamReminderOccurrence(streamInfo),
        );
        const statsButton = buildEmbeddedAppStatsButton(guildId);
        const message = await editReply({
          embeds: [buildStreamInfoEmbed(streamInfo)],
          components: [
            ...(reminderButton ? [reminderButton] : []),
            ...(statsButton ? [statsButton] : []),
          ],
        });

        if (!isPrivate) {
          await registerLastStreamInfoMessage({
            guildId,
            channelId: interaction.channelId,
            message,
          });
        }

        return message;
      },
    });
  }
}
