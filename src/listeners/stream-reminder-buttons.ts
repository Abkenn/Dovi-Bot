import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { isAllowedGuildForCommand } from '../config/discord-access';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { CommandExecutionStatus } from '../generated/prisma/client';
import { createInteractionExecutionLog } from '../modules/command-logging/command-logging.service';
import {
  buildStreamAnnouncementReminderMessage,
  STREAM_LIVE_ALERT_DISABLE_CUSTOM_ID_PREFIX,
  STREAM_LIVE_ALERT_ENABLE_CUSTOM_ID_PREFIX,
  STREAM_REMINDER_CUSTOM_ID_PREFIX,
} from '../modules/stream-info/stream-info.discord';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';
import {
  setLiveReminderEnabled,
  subscribeToStreamReminder,
} from '../modules/stream-info/stream-reminder.service';
import { getStreamReminderOccurrence } from '../modules/stream-info/stream-reminder.utils';

const STREAM_REMIND_ME_LOG_NAME = 'streaminfo:remind-me';

const logStreamReminderSafely = async ({
  interaction,
  dateKey,
  status,
  startedAt,
  note,
}: {
  interaction: Interaction;
  dateKey: string;
  status: CommandExecutionStatus;
  startedAt: number;
  note?: string | null;
}) => {
  try {
    await createInteractionExecutionLog({
      interaction,
      commandName: STREAM_REMIND_ME_LOG_NAME,
      optionsJson: {
        customId: interaction.isButton() ? interaction.customId : null,
        dateKey,
      },
      status,
      note: note ?? null,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('Failed to log stream reminder interaction', error);
  }
};

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
    const startedAt = Date.now();

    if (!interaction.isButton()) {
      return;
    }

    const disablePrefix = `${STREAM_LIVE_ALERT_DISABLE_CUSTOM_ID_PREFIX}:`;
    const enablePrefix = `${STREAM_LIVE_ALERT_ENABLE_CUSTOM_ID_PREFIX}:`;
    const isDisable = interaction.customId.startsWith(disablePrefix);
    const isEnable = interaction.customId.startsWith(enablePrefix);
    if (isDisable || isEnable) {
      try {
        const prefix = isDisable ? disablePrefix : enablePrefix;
        const enabled = isEnable;
        const reminder = await setLiveReminderEnabled({
          enabled,
          reminderId: interaction.customId.slice(prefix.length),
          userId: interaction.user.id,
        });

        return interaction.update(
          buildStreamAnnouncementReminderMessage(
            reminder.streamUrl,
            reminder.scheduledStartAt,
            reminder.reminderId,
            enabled,
          ),
        );
      } catch {
        return interaction.deferUpdate();
      }
    }

    const prefix = `${STREAM_REMINDER_CUSTOM_ID_PREFIX}:`;
    if (!interaction.customId.startsWith(prefix)) {
      return;
    }

    const dateKey = interaction.customId.slice(prefix.length);
    const guildId = interaction.guildId;
    if (
      !guildId ||
      !isAllowedGuildForCommand(guildId, COMMAND_METADATA.STREAM_INFO.guildIds)
    ) {
      await logStreamReminderSafely({
        interaction,
        dateKey,
        status: CommandExecutionStatus.DENIED,
        startedAt,
        note: 'This stream reminder is no longer available.',
      });

      return interaction.reply({
        content: 'This stream reminder is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
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

      await logStreamReminderSafely({
        interaction,
        dateKey,
        status: CommandExecutionStatus.SUCCESS,
        startedAt,
      });

      return interaction.editReply('Reminder set. I’ll notify you when live.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong while setting the reminder.';

      await logStreamReminderSafely({
        interaction,
        dateKey,
        status: CommandExecutionStatus.ERROR,
        startedAt,
        note: message,
      });

      return interaction.editReply(message);
    }
  }
}
