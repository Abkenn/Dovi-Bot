import { ButtonStyle, ComponentType } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { buildPingMeDmOptions } from '../../src/modules/ping-me/ping-me.discord-message';

describe('ping-me DM output', () => {
  it('shows one keyword, a dynamic channel, and a message link when accessible', () => {
    expect(
      buildPingMeDmOptions({
        authorLabel: 'Viewer',
        matchedKeyword: 'dolor',
        channelId: 'channel-id',
        messageUrl: 'https://discord.com/channels/guild/channel/message',
        canAccess: true,
      }),
    ).toEqual({
      content: 'Viewer mentioned "dolor" in <#channel-id>.',
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              style: ButtonStyle.Link,
              label: 'View message',
              url: 'https://discord.com/channels/guild/channel/message',
            },
          ],
        },
      ],
    });
  });

  it('lets Discord resolve an inaccessible channel while withholding navigation', () => {
    expect(
      buildPingMeDmOptions({
        authorLabel: 'Viewer',
        matchedKeyword: 'dolor',
        channelId: 'hidden-channel-id',
        messageUrl: 'https://discord.com/channels/guild/hidden/message',
        canAccess: false,
      }),
    ).toEqual({
      content: 'Viewer mentioned "dolor" in <#hidden-channel-id>.',
    });
  });
});
