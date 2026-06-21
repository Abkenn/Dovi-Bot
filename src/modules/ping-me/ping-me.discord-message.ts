import {
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
  type MessageCreateOptions,
} from 'discord.js';
import type { BuildPingMeDmOptionsInput } from './ping-me.types';

export const buildPingMeDmOptions = ({
  authorLabel,
  matchedKeyword,
  channelId,
  messageUrl,
  canAccess,
}: BuildPingMeDmOptionsInput): MessageCreateOptions => {
  const channelLabel = `<#${channelId}>`;
  const options: MessageCreateOptions = {
    content:
      escapeMarkdown(authorLabel) +
      ' mentioned "' +
      escapeMarkdown(matchedKeyword) +
      '" in ' +
      channelLabel +
      '.',
  };

  if (canAccess) {
    options.components = [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: 'View message',
            url: messageUrl,
          },
        ],
      },
    ];
  }

  return options;
};
