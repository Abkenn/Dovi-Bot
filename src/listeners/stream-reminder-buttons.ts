import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { BOT_GUILDS, isAllowedGuildForCommand } from '../config/discord-access';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { CommandExecutionStatus } from '../generated/prisma/client';
import { createInteractionExecutionLog } from '../modules/command-logging/command-logging.service';
import {
  STAGING_STREAM_ANNOUNCEMENT_VIDEO_TITLE,
  STAGING_STREAM_ANNOUNCEMENT_VIDEO_URL,
} from '../modules/stream-info/stream-announcement.config';
import {
  buildStreamAnnouncementReminderMessage,
  STREAM_LIVE_ALERT_DISABLE_CUSTOM_ID_PREFIX,
  STREAM_LIVE_ALERT_ENABLE_CUSTOM_ID_PREFIX,
  STREAM_PERMANENT_DISABLE_CUSTOM_ID_PREFIX,
  STREAM_PERMANENT_ENABLE_CUSTOM_ID_PREFIX,
  STREAM_REMINDER_CUSTOM_ID_PREFIX,
  STREAM_STAGING_REMINDER_CUSTOM_ID_PREFIX,
} from '../modules/stream-info/stream-info.discord';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';
import {
  deliverStreamReminders,
  getPermanentStreamReminderEnabled,
  getStreamReminderMessageState,
  setLiveReminderEnabled,
  setPermanentStreamReminder,
  subscribeToStreamReminder,
} from '../modules/stream-info/stream-reminder.service';

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
        const permanentReminderEnabled =
          await getPermanentStreamReminderEnabled(
            reminder.guildId,
            interaction.user.id,
          );

        return interaction.update(
          buildStreamAnnouncementReminderMessage(
            reminder.streamUrl,
            reminder.scheduledStartAt,
            reminder.reminderId,
            enabled,
            permanentReminderEnabled,
            reminder.guildId,
          ),
        );
      } catch {
        return interaction.deferUpdate();
      }
    }

    const permanentDisablePrefix = `${STREAM_PERMANENT_DISABLE_CUSTOM_ID_PREFIX}:`;
    const permanentEnablePrefix = `${STREAM_PERMANENT_ENABLE_CUSTOM_ID_PREFIX}:`;
    const isPermanentDisable = interaction.customId.startsWith(
      permanentDisablePrefix,
    );
    const isPermanentEnable = interaction.customId.startsWith(
      permanentEnablePrefix,
    );
    if (isPermanentDisable || isPermanentEnable) {
      try {
        const prefix = isPermanentDisable
          ? permanentDisablePrefix
          : permanentEnablePrefix;
        const [guildId, reminderId] = interaction.customId
          .slice(prefix.length)
          .split(':');
        if (!guildId || !reminderId) {
          throw new Error('Invalid permanent reminder button.');
        }

        const enabled = isPermanentEnable;
        await setPermanentStreamReminder({
          enabled,
          guildId,
          userId: interaction.user.id,
        });
        const reminder = await getStreamReminderMessageState(
          reminderId,
          interaction.user.id,
        );

        return interaction.update(
          buildStreamAnnouncementReminderMessage(
            reminder.streamUrl,
            reminder.scheduledStartAt,
            reminder.reminderId,
            reminder.liveAlertEnabled,
            enabled,
            guildId,
          ),
        );
      } catch {
        return interaction.deferUpdate();
      }
    }

    const reminderPrefix = `${STREAM_REMINDER_CUSTOM_ID_PREFIX}:`;
    const stagingReminderPrefix = `${STREAM_STAGING_REMINDER_CUSTOM_ID_PREFIX}:`;
    const isStagingReminder = interaction.customId.startsWith(
      stagingReminderPrefix,
    );
    if (
      !interaction.customId.startsWith(reminderPrefix) &&
      !isStagingReminder
    ) {
      return;
    }

    const prefix = isStagingReminder ? stagingReminderPrefix : reminderPrefix;
    const dateKey = interaction.customId.slice(prefix.length);
    const guildId = interaction.guildId;
    const isAllowedStagingReminder =
      isStagingReminder && guildId === BOT_GUILDS.STAGING_ENV;
    if (
      !guildId ||
      (!isAllowedStagingReminder &&
        !isAllowedGuildForCommand(
          guildId,
          COMMAND_METADATA.STREAM_INFO.guildIds,
        ))
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
      const matchingOccurrence = [streamInfo.current, streamInfo.next].find(
        (occurrence) => occurrence?.dateKey === dateKey,
      );

      if (!matchingOccurrence) {
        throw new Error('That stream is no longer available for reminders.');
      }
      const occurrence = isStagingReminder
        ? {
            ...matchingOccurrence,
            streamUrl: STAGING_STREAM_ANNOUNCEMENT_VIDEO_URL,
            videoTitle: STAGING_STREAM_ANNOUNCEMENT_VIDEO_TITLE,
            streamIsLive: false,
          }
        : matchingOccurrence;

      await subscribeToStreamReminder({
        guildId,
        userId: interaction.user.id,
        occurrence,
      });
      await deliverStreamReminders({
        client: interaction.client,
        guildId,
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
