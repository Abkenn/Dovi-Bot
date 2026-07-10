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
import { getStreamInfo } from './stream-info.service';
import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';
import { isStreamReminderEligible } from './stream-reminder.utils';

export const STREAM_REMINDER_CUSTOM_ID_PREFIX = 'stream-reminder';
export const STREAM_LIVE_ALERT_DISABLE_CUSTOM_ID_PREFIX =
  'stream-live-alert-disable';
export const EMBEDDED_APP_STATS_CUSTOM_ID = 'embedded-app-stats';

const discordTs = (date: Date, style: 'F' | 'R'): string => {
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:${style}>`;
};

const shouldShowGame = (occurrence: StreamOccurrence): boolean => {
  const isGame = occurrence.streamKind === StreamKind.GAME;
  const isDictatorshipMusic =
    occurrence.streamKind === StreamKind.MUSIC &&
    occurrence.musicMode === MusicMode.DICTATORSHIP;

  return isGame || isDictatorshipMusic;
};

const buildOccurrenceValue = (
  label: 'Current' | 'Next',
  occurrence: StreamOccurrence | null,
): string => {
  if (!occurrence) {
    return label === 'Next' ? 'No upcoming stream found.' : '-';
  }

  const startsInFuture = occurrence.startAt.getTime() > Date.now();
  let relativePrefix = '';
  if (label === 'Current') {
    relativePrefix = startsInFuture ? 'starts ' : 'started ';
  }

  const lines = [occurrence.title ?? 'Stream'];

  if (occurrence.videoTitle?.trim() && occurrence.streamUrl) {
    lines.push(`[${occurrence.videoTitle.trim()}](${occurrence.streamUrl})`);
  }

  lines.push(
    `${discordTs(occurrence.startAt, 'F')} (${relativePrefix}${discordTs(
      occurrence.startAt,
      'R',
    )})`,
  );

  if (shouldShowGame(occurrence) && occurrence.gameName?.trim()) {
    lines.push(`Game: ${occurrence.gameName}`);
  }

  return lines.join('\n');
};

const getOccurrenceFieldName = (
  label: 'Current stream' | 'Next stream',
  occurrence: StreamOccurrence | null,
) => {
  if (!occurrence?.streamUrl) {
    return label;
  }

  return `[${label}](${occurrence.streamUrl})`;
};

export const buildStreamInfoEmbed = (data: StreamInfoResult): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle('Stream Info')
    .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.STREAM_INFO));

  if (data.current) {
    embed.addFields({
      name: getOccurrenceFieldName('Current stream', data.current),
      value: buildOccurrenceValue('Current', data.current),
    });
  }

  embed.addFields({
    name: getOccurrenceFieldName('Next stream', data.next),
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

export const buildEmbeddedAppStatsButton = (
  guildId: string,
  stagingGuildId: string,
): ActionRowBuilder<ButtonBuilder> | null => {
  if (guildId !== stagingGuildId) {
    return null;
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(EMBEDDED_APP_STATS_CUSTOM_ID)
      .setLabel('Stats')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary),
  );
};

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
  if (liveAlertEnabled) {
    buttons.push({
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      customId: `${STREAM_LIVE_ALERT_DISABLE_CUSTOM_ID_PREFIX}:${reminderId}`,
      label: 'Skip Live Reminder',
    });
  }

  const components: ComponentInContainerData[] = [
    {
      type: ComponentType.TextDisplay,
      content: `# Stream starts ${discordTs(scheduledStartAt, 'R')}\n**Live reminder: ${liveReminderStatus}**`,
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

export const getStreamInfoEmbed = async (
  guildId: string,
): Promise<EmbedBuilder> => buildStreamInfoEmbed(await getStreamInfo(guildId));
