import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { BOT_GUILDS, isAllowedGuildForCommand } from '../config/discord-access';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  CommandExecutionStatus,
  type Prisma,
} from '../generated/prisma/client';
import { createInteractionExecutionLog } from '../modules/command-logging/command-logging.service';
import {
  STAGING_STREAM_ANNOUNCEMENT_VIDEO_TITLE,
  STAGING_STREAM_ANNOUNCEMENT_VIDEO_URL,
} from '../modules/stream-info/stream-announcement.config';
import {
  buildExpiredStreamReminderMessage,
  buildStreamAnnouncementReminderMessage,
  STREAM_EXPIRED_PERMANENT_DISABLE_CUSTOM_ID_PREFIX,
  STREAM_EXPIRED_PERMANENT_ENABLE_CUSTOM_ID_PREFIX,
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

type StreamReminderInteractionLogInput = {
  interaction: Interaction;
  optionsJson: Prisma.InputJsonValue;
  status: CommandExecutionStatus;
  startedAt: number;
  note?: string | null;
};

const logStreamReminderSafely = async ({
  interaction,
  optionsJson,
  status,
  startedAt,
  note,
}: StreamReminderInteractionLogInput) => {
  try {
    await createInteractionExecutionLog({
      interaction,
      commandName: STREAM_REMIND_ME_LOG_NAME,
      optionsJson,
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
      const prefix = isDisable ? disablePrefix : enablePrefix;
      const enabled = isEnable;
      const reminderId = interaction.customId.slice(prefix.length);
      const optionsJson = {
        action: 'live-alert',
        enabled,
        reminderId,
      } satisfies Prisma.InputJsonValue;

      try {
        const reminder = await setLiveReminderEnabled({
          enabled,
          reminderId,
          userId: interaction.user.id,
        });
        const permanentReminderEnabled =
          await getPermanentStreamReminderEnabled(
            reminder.guildId,
            interaction.user.id,
          );

        await interaction.update(
          buildStreamAnnouncementReminderMessage(
            reminder.streamUrl,
            reminder.scheduledStartAt,
            reminder.reminderId,
            enabled,
            permanentReminderEnabled,
            reminder.guildId,
          ),
        );

        await logStreamReminderSafely({
          interaction,
          optionsJson,
          status: CommandExecutionStatus.SUCCESS,
          startedAt,
        });
      } catch (error) {
        await logStreamReminderSafely({
          interaction,
          optionsJson,
          status: CommandExecutionStatus.ERROR,
          startedAt,
          note: error instanceof Error ? error.message : String(error),
        });

        return interaction.deferUpdate();
      }

      return;
    }

    const expiredPermanentDisablePrefix = `${STREAM_EXPIRED_PERMANENT_DISABLE_CUSTOM_ID_PREFIX}:`;
    const expiredPermanentEnablePrefix = `${STREAM_EXPIRED_PERMANENT_ENABLE_CUSTOM_ID_PREFIX}:`;
    const isExpiredPermanentDisable = interaction.customId.startsWith(
      expiredPermanentDisablePrefix,
    );
    const isExpiredPermanentEnable = interaction.customId.startsWith(
      expiredPermanentEnablePrefix,
    );
    if (isExpiredPermanentDisable || isExpiredPermanentEnable) {
      const prefix = isExpiredPermanentDisable
        ? expiredPermanentDisablePrefix
        : expiredPermanentEnablePrefix;
      const guildId = interaction.customId.slice(prefix.length);
      const enabled = isExpiredPermanentEnable;
      const optionsJson = {
        action: 'permanent-reminder',
        enabled,
        guildId: guildId || null,
        reminderId: null,
      } satisfies Prisma.InputJsonValue;

      try {
        if (!guildId) {
          throw new Error('Invalid permanent reminder button.');
        }
        await setPermanentStreamReminder({
          enabled,
          guildId,
          userId: interaction.user.id,
        });
        await interaction.update(
          buildExpiredStreamReminderMessage(guildId, enabled),
        );
        await logStreamReminderSafely({
          interaction,
          optionsJson,
          status: CommandExecutionStatus.SUCCESS,
          startedAt,
        });
      } catch (error) {
        await logStreamReminderSafely({
          interaction,
          optionsJson,
          status: CommandExecutionStatus.ERROR,
          startedAt,
          note: error instanceof Error ? error.message : String(error),
        });

        return interaction.deferUpdate();
      }

      return;
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
        const optionsJson = {
          action: 'permanent-reminder',
          enabled,
          guildId,
          reminderId,
        } satisfies Prisma.InputJsonValue;
        await setPermanentStreamReminder({
          enabled,
          guildId,
          userId: interaction.user.id,
        });
        const reminder = await getStreamReminderMessageState(
          reminderId,
          interaction.user.id,
        );

        await interaction.update(
          buildStreamAnnouncementReminderMessage(
            reminder.streamUrl,
            reminder.scheduledStartAt,
            reminder.reminderId,
            reminder.liveAlertEnabled,
            enabled,
            guildId,
          ),
        );

        await logStreamReminderSafely({
          interaction,
          optionsJson,
          status: CommandExecutionStatus.SUCCESS,
          startedAt,
        });
      } catch (error) {
        const parts = interaction.customId
          .slice(
            (isPermanentDisable
              ? permanentDisablePrefix
              : permanentEnablePrefix
            ).length,
          )
          .split(':');
        await logStreamReminderSafely({
          interaction,
          optionsJson: {
            action: 'permanent-reminder',
            enabled: isPermanentEnable,
            guildId: parts[0] ?? null,
            reminderId: parts[1] ?? null,
          },
          status: CommandExecutionStatus.ERROR,
          startedAt,
          note: error instanceof Error ? error.message : String(error),
        });

        return interaction.deferUpdate();
      }

      return;
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
        optionsJson: {
          customId: interaction.customId,
          dateKey,
        },
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
        optionsJson: {
          customId: interaction.customId,
          dateKey,
        },
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
        optionsJson: {
          customId: interaction.customId,
          dateKey,
        },
        status: CommandExecutionStatus.ERROR,
        startedAt,
        note: message,
      });

      if (message === 'That stream is no longer available for reminders.') {
        try {
          const permanentReminderEnabled =
            await getPermanentStreamReminderEnabled(
              guildId,
              interaction.user.id,
            );
          return interaction.editReply(
            buildExpiredStreamReminderMessage(
              guildId,
              permanentReminderEnabled,
            ),
          );
        } catch (preferenceError) {
          console.error(
            'Failed to load permanent stream reminder preference',
            preferenceError,
          );
        }
      }

      return interaction.editReply(message);
    }
  }
}
