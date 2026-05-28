import {
  ButtonStyle,
  type ComponentInContainerData,
  ComponentType,
  type MessageEditOptions,
  MessageFlags,
  type TopLevelComponentData,
} from 'discord.js';
import type { BotStatus } from './bot-status.service';

export const BOT_STATUS_REFRESH_CUSTOM_ID = 'bot-status:refresh';

const formatStatusLine = (status: BotStatus) =>
  status.isOperational
    ? '\u{1F7E2} **Operational**'
    : '\u{1F7E0} **Needs attention**';

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
  const lines = ['# Dovi Bot Status', formatStatusLine(status)];

  if (status.database) {
    lines.push(`Database: ${formatDatabaseStatus(status.database)}`);
  }

  const components: ComponentInContainerData[] = [
    {
      type: ComponentType.TextDisplay,
      content: lines.join('\n'),
    },
  ];

  if (!status.isOperational) {
    components.push({
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          customId: BOT_STATUS_REFRESH_CUSTOM_ID,
          label: 'Check again',
          style: ButtonStyle.Secondary,
        },
      ],
    });
  }

  const container: TopLevelComponentData = {
    type: ComponentType.Container,
    accentColor: status.isOperational ? 0x57f287 : 0xf59e0b,
    components,
  };

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
};
