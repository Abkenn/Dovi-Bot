import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonComponentData,
  ButtonStyle,
  type ComponentInContainerData,
  ComponentType,
  EmbedBuilder,
  type MessageCreateOptions,
  MessageFlags,
  type TopLevelComponentData,
} from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../config/discord-command-categories';
import { MusicMode, StreamKind } from '../../generated/prisma/client';
import type { BuildStreamAnnouncementChangePreviewInput } from './stream-announcement.types';
import { getStreamInfo } from './stream-info.service';
import type {
  BuildStreamAnnouncementMessageInput,
  StreamInfoResult,
  StreamOccurrence,
} from './stream-info.types';
import { isStreamReminderEligible } from './stream-reminder.utils';

export const STREAM_REMINDER_CUSTOM_ID_PREFIX = 'stream-reminder';
export const STREAM_LIVE_ALERT_DISABLE_CUSTOM_ID_PREFIX =
  'stream-live-alert-disable';
export const STREAM_LIVE_ALERT_ENABLE_CUSTOM_ID_PREFIX =
  'stream-live-alert-enable';
export const STREAM_PERMANENT_DISABLE_CUSTOM_ID_PREFIX =
  'stream-permanent-disable';
export const STREAM_PERMANENT_ENABLE_CUSTOM_ID_PREFIX =
  'stream-permanent-enable';
export const STREAM_EXPIRED_PERMANENT_DISABLE_CUSTOM_ID_PREFIX =
  'stream-expired-permanent-disable';
export const STREAM_EXPIRED_PERMANENT_ENABLE_CUSTOM_ID_PREFIX =
  'stream-expired-permanent-enable';
export const STREAM_STAGING_REMINDER_CUSTOM_ID_PREFIX =
  'stream-staging-reminder';
export const STREAM_ANNOUNCEMENT_AUTO_APPROVE_CUSTOM_ID_PREFIX =
  'stream-announcement-auto-approve';
export const STREAM_ANNOUNCEMENT_AUTO_DECLINE_CUSTOM_ID_PREFIX =
  'stream-announcement-auto-decline';
export const STREAM_ANNOUNCEMENT_CHANGE_APPROVE_CUSTOM_ID_PREFIX =
  'stream-announcement-change-approve';
export const STREAM_ANNOUNCEMENT_CHANGE_DECLINE_CUSTOM_ID_PREFIX =
  'stream-announcement-change-decline';
const STREAM_ANNOUNCEMENT_ACTION_LABELS = {
  UPDATE: 'Update',
  PUSH: 'Push',
  DELETE: 'Delete',
} as const;
const discordTs = (date: Date, style: 'F' | 'R'): string => {
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:${style}>`;
};

const shouldShowGame = (occurrence: StreamOccurrence): boolean => {
  const isGame = occurrence.streamKind === StreamKind.GAME;
  const isDictatorshipMusic =
    occurrence.streamKind === StreamKind.MUSIC &&
    occurrence.musicMode === MusicMode.DICTATORSHIP;

  return isGame || isDictatorshipMusic || occurrence.isCombined === true;
};

const buildOccurrenceValue = (
  label: 'Current' | 'Next',
  occurrence: StreamOccurrence | null,
): string => {
  if (!occurrence) {
    return label === 'Next' ? 'No upcoming stream found.' : '-';
  }

  const now = Date.now();
  const isDelayedUpcomingStream =
    label === 'Current' &&
    occurrence.streamIsLive === false &&
    occurrence.startAt.getTime() <= now;
  const displayedStartAt = isDelayedUpcomingStream
    ? new Date(now + 60_000)
    : occurrence.startAt;
  const startsInFuture = displayedStartAt.getTime() > now;
  let relativePrefix = '';
  if (label === 'Current') {
    relativePrefix = startsInFuture ? 'starts ' : 'started ';
  }

  const title = occurrence.title ?? 'Stream';
  const displayTitle = occurrence.isCombined
    ? `Combined Stream: ${title} + Game Stream`
    : title;
  const lines = [displayTitle];

  if (occurrence.customTitle?.trim()) {
    lines.push(`Title: ${occurrence.customTitle.trim()}`);
  }

  if (
    occurrence.streamKind === StreamKind.MUSIC &&
    occurrence.musicTheme?.trim()
  ) {
    lines.push(`Theme: ${occurrence.musicTheme.trim()}`);
  }

  if (occurrence.videoTitle?.trim() && occurrence.streamUrl) {
    lines.push(`[${occurrence.videoTitle.trim()}](${occurrence.streamUrl})`);
  }

  lines.push(
    `${discordTs(displayedStartAt, 'F')} (${relativePrefix}${discordTs(
      displayedStartAt,
      'R',
    )})`,
  );

  if (shouldShowGame(occurrence) && occurrence.gameName?.trim()) {
    const gameLabel = occurrence.isCombined ? 'Game later' : 'Game';
    lines.push(`${gameLabel}: ${occurrence.gameName}`);
  }

  return lines.join('\n');
};

export const buildStreamInfoEmbed = (data: StreamInfoResult): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle('Stream Info')
    .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.STREAM_INFO));

  if (data.current) {
    embed.addFields({
      name: 'Current stream',
      value: buildOccurrenceValue('Current', data.current),
    });
  }

  embed.addFields({
    name: 'Next stream',
    value: buildOccurrenceValue('Next', data.next),
  });

  return embed;
};

export const buildStreamReminderButton = (
  occurrence: StreamOccurrence | null,
): ActionRowBuilder<ButtonBuilder> | null => {
  if (!isStreamReminderEligible(occurrence)) {
    return null;
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${STREAM_REMINDER_CUSTOM_ID_PREFIX}:${occurrence.dateKey}`)
      .setLabel('Remind Me')
      .setEmoji('⏰')
      .setStyle(ButtonStyle.Primary),
  );
};

export const buildStreamAnnouncementReminderButton = (
  occurrence: StreamOccurrence | null,
  customIdPrefix = STREAM_REMINDER_CUSTOM_ID_PREFIX,
): ActionRowBuilder<ButtonBuilder> | null => {
  if (!occurrence || occurrence.streamIsLive === true) {
    return null;
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}:${occurrence.dateKey}`)
      .setLabel('Remind Me')
      .setEmoji('⏰')
      .setStyle(ButtonStyle.Primary),
  );
};

const getStreamAnnouncementMention = (roleId?: string, userId?: string) => {
  if (roleId) return `<@&${roleId}>`;
  if (userId) return `<@${userId}>`;
  return null;
};

const getStreamAnnouncementAllowedMentions = (
  roleId?: string,
  userId?: string,
) => {
  if (roleId) return { roles: [roleId] };
  if (userId) return { users: [userId] };
  return { parse: [] };
};

export const buildStreamAnnouncementMessages = ({
  occurrence,
  roleId,
  streamInfo,
  reminderCustomIdPrefix,
  userId,
}: BuildStreamAnnouncementMessageInput) => {
  if (!occurrence.streamUrl) {
    throw new Error('A stream URL is required for an announcement.');
  }

  const reminderButton = buildStreamAnnouncementReminderButton(
    occurrence,
    reminderCustomIdPrefix,
  );
  const mention = getStreamAnnouncementMention(roleId, userId);
  const allowedMentions = getStreamAnnouncementAllowedMentions(roleId, userId);

  return {
    info: {
      embeds: [buildStreamInfoEmbed(streamInfo)],
      components: reminderButton ? [reminderButton] : [],
      allowedMentions: { parse: [] },
    },
    link: {
      content: [mention, occurrence.streamUrl]
        .filter((line) => line !== null)
        .join('\n'),
      allowedMentions,
    },
  };
};

export const buildStreamAnnouncementReviewMessage = (
  userId: string,
  streamInfo: StreamInfoResult,
  occurrence: StreamOccurrence,
): MessageCreateOptions => ({
  content: `<@${userId}> Stream announcement is probably happening in about 15 minutes. This is the current version. Please review it and use \`/davi-update-announcement\` if anything needs changing. No response keeps automatic posting enabled.`,
  embeds: [buildStreamInfoEmbed(streamInfo)],
  components: [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${STREAM_ANNOUNCEMENT_AUTO_APPROVE_CUSTOM_ID_PREFIX}:${occurrence.dateKey}`,
        )
        .setLabel('Approve Automatic Announcement')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(
          `${STREAM_ANNOUNCEMENT_AUTO_DECLINE_CUSTOM_ID_PREFIX}:${occurrence.dateKey}`,
        )
        .setLabel('Decline Automatic Announcement')
        .setStyle(ButtonStyle.Danger),
    ),
  ],
  allowedMentions: { users: [userId] },
});

export const buildStreamAnnouncementChangePreview = ({
  action,
  requestId,
  roleId,
  streamInfo,
  streamUrl,
}: BuildStreamAnnouncementChangePreviewInput) => ({
  content: [
    roleId ? `<@&${roleId}>` : null,
    streamUrl || null,
    `${STREAM_ANNOUNCEMENT_ACTION_LABELS[action]} this announcement?`,
  ]
    .filter((line) => line !== null)
    .join('\n'),
  embeds: [buildStreamInfoEmbed(streamInfo)],
  components: [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${STREAM_ANNOUNCEMENT_CHANGE_APPROVE_CUSTOM_ID_PREFIX}:${requestId}`,
        )
        .setLabel(`Approve ${STREAM_ANNOUNCEMENT_ACTION_LABELS[action]}`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(
          `${STREAM_ANNOUNCEMENT_CHANGE_DECLINE_CUSTOM_ID_PREFIX}:${requestId}`,
        )
        .setLabel('Decline')
        .setStyle(ButtonStyle.Secondary),
    ),
  ],
  allowedMentions: { parse: [] },
});

export const buildStreamLiveReminderMessage = (
  videoTitle: string,
  streamUrl: string,
): MessageCreateOptions => {
  const components: ComponentInContainerData[] = [
    {
      type: ComponentType.TextDisplay,
      content: `# 🔴 Davi is live!\n[${videoTitle}](${streamUrl})`,
    },
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ButtonStyle.Link,
          label: 'Watch Stream',
          emoji: { name: '▶️' },
          url: streamUrl,
        },
      ],
    },
  ];
  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    accentColor: 0xff3131,
    components,
  };

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
};

export const buildStreamAnnouncementReminderMessage = (
  streamUrl: string,
  scheduledStartAt: Date,
  reminderId: string,
  liveAlertEnabled: boolean,
  permanentReminderEnabled: boolean,
  guildId: string,
) => {
  const liveReminderStatus = liveAlertEnabled ? 'On' : 'Off';
  const buttons: ButtonComponentData[] = [
    {
      type: ComponentType.Button,
      style: ButtonStyle.Link,
      label: 'Open Stream',
      url: streamUrl,
    },
  ];
  const togglePrefix = liveAlertEnabled
    ? STREAM_LIVE_ALERT_DISABLE_CUSTOM_ID_PREFIX
    : STREAM_LIVE_ALERT_ENABLE_CUSTOM_ID_PREFIX;
  buttons.push({
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: `${togglePrefix}:${reminderId}`,
    label: liveAlertEnabled ? 'Disable Live Reminder' : 'Enable Live Reminder',
  });
  const permanentTogglePrefix = permanentReminderEnabled
    ? STREAM_PERMANENT_DISABLE_CUSTOM_ID_PREFIX
    : STREAM_PERMANENT_ENABLE_CUSTOM_ID_PREFIX;
  buttons.push({
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    customId: `${permanentTogglePrefix}:${guildId}:${reminderId}`,
    label: permanentReminderEnabled
      ? 'Disable All Future Reminders'
      : 'Remind Me for All Future Streams',
  });

  const components: ComponentInContainerData[] = [
    {
      type: ComponentType.TextDisplay,
      content: `# Stream starts ${discordTs(scheduledStartAt, 'R')}\n**Live reminder: ${liveReminderStatus}**\n**All future streams: ${permanentReminderEnabled ? 'On' : 'Off'}**`,
    },
    {
      type: ComponentType.ActionRow,
      components: buttons,
    },
  ];

  return {
    components: [
      {
        type: ComponentType.Container,
        accentColor: 0xff3131,
        components,
      },
    ],
    flags: MessageFlags.IsComponentsV2,
  } satisfies MessageCreateOptions;
};

export const buildExpiredStreamReminderMessage = (
  guildId: string,
  permanentReminderEnabled: boolean,
) => {
  const togglePrefix = permanentReminderEnabled
    ? STREAM_EXPIRED_PERMANENT_DISABLE_CUSTOM_ID_PREFIX
    : STREAM_EXPIRED_PERMANENT_ENABLE_CUSTOM_ID_PREFIX;

  return {
    content: `That stream is no longer available for reminders.\nCurrently you have all future reminders turned ${permanentReminderEnabled ? 'on' : 'off'}.`,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${togglePrefix}:${guildId}`)
          .setLabel(
            permanentReminderEnabled
              ? 'Disable All Future Reminders'
              : 'Remind Me for All Future Streams',
          )
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
};

export const getStreamInfoEmbed = async (
  guildId: string,
): Promise<EmbedBuilder> => buildStreamInfoEmbed(await getStreamInfo(guildId));
