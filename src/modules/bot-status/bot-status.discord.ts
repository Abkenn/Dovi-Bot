import {
  ComponentType,
  type MessageEditOptions,
  MessageFlags,
  SeparatorSpacingSize,
  type TopLevelComponentData,
} from 'discord.js';
import {
  getCommandCategoryAccentColor,
  HELP_CATEGORIES,
} from '../../config/discord-command-categories';
import type { BotStatus, BotStatusDay } from './bot-status.service';

const MAX_UPTIME_DAYS = 60;

const formatTimestamp = (date: Date) =>
  `<t:${Math.floor(date.getTime() / 1000)}:R>`;

const formatResponseTime = (value: number | null) =>
  value === null ? 'Unknown' : `${value}ms`;

const getDayMarker = (day: BotStatusDay) => {
  if (day.status === 'up') {
    return '🟩';
  }

  if (day.status === 'degraded') {
    return '🟧';
  }

  return '🟥';
};

const formatUptimeStrip = (days: BotStatusDay[]) => {
  const visibleDays = days.slice(-MAX_UPTIME_DAYS);

  if (visibleDays.length === 0) {
    return 'No uptime history yet.';
  }

  return visibleDays.map(getDayMarker).join('');
};

const formatStatusLine = (status: BotStatus) =>
  status.isOperational ? '🟢 **Operational**' : '🟠 **Needs attention**';

const formatDatabaseStatus = (status: BotStatus['database']) => {
  if (status === 'healthy') {
    return 'Healthy';
  }

  if (status === 'sleepy') {
    return 'Sleepy';
  }

  return 'Unknown';
};

export const buildBotStatusMessage = (
  status: BotStatus,
): MessageEditOptions => {
  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    accentColor: status.isOperational
      ? 0x57f287
      : getCommandCategoryAccentColor(HELP_CATEGORIES.BOSSES),
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          '# Dovi Bot Status',
          formatStatusLine(status),
          `Database: ${formatDatabaseStatus(status.database)}`,
          status.checkInterval,
          `Updated ${formatTimestamp(status.checkedAt)}`,
        ].join('\n'),
      },
      {
        type: ComponentType.Separator,
        divider: true,
        spacing: SeparatorSpacingSize.Small,
      },
      {
        type: ComponentType.TextDisplay,
        content: [
          '### Uptime',
          formatUptimeStrip(status.days),
          '',
          `**24h** ${status.uptime.last24Hours}   **7d** ${status.uptime.last7Days}`,
          `**30d** ${status.uptime.last30Days}   **90d** ${status.uptime.last90Days}`,
        ].join('\n'),
      },
      {
        type: ComponentType.Separator,
        divider: true,
        spacing: SeparatorSpacingSize.Small,
      },
      {
        type: ComponentType.TextDisplay,
        content: [
          '### Response Time',
          `**Avg** ${formatResponseTime(status.responseTime.averageMs)}   **Max** ${formatResponseTime(status.responseTime.maximumMs)}   **Min** ${formatResponseTime(status.responseTime.minimumMs)}`,
        ].join('\n'),
      },
    ],
  };

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
};
