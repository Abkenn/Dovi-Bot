import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { isAllowedGuildForCommand } from '../config/discord-access';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { STREAM_REMINDER_CUSTOM_ID_PREFIX } from '../modules/stream-info/stream-info.discord';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';
import { subscribeToStreamReminder } from '../modules/stream-info/stream-reminder.service';
import { getStreamReminderOccurrence } from '../modules/stream-info/stream-reminder.utils';

export class StreamReminderButtonsListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public override async run(interaction: Interaction) {
    if (!interaction.isButton()) {
      return;
    }

    const prefix = `${STREAM_REMINDER_CUSTOM_ID_PREFIX}:`;
    if (!interaction.customId.startsWith(prefix)) {
      return;
    }

    const guildId = interaction.guildId;
    if (
      !guildId ||
      !isAllowedGuildForCommand(guildId, COMMAND_METADATA.STREAM_INFO.guildIds)
    ) {
      return interaction.reply({
        content: 'This stream reminder is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const dateKey = interaction.customId.slice(prefix.length);
      const streamInfo = await getStreamInfo(guildId);
      const occurrence = getStreamReminderOccurrence(streamInfo);

      if (!occurrence || occurrence.dateKey !== dateKey) {
        throw new Error('That stream is no longer available for reminders.');
      }

      await subscribeToStreamReminder({
        guildId,
        userId: interaction.user.id,
        occurrence,
      });

      return interaction.editReply(
        '⏰ Reminder set! I’ll DM you as soon as Davi goes live.',
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong while setting the reminder.';

      return interaction.editReply(message);
    }
  }
}
