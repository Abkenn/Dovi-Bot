import type { EmbedBuilder } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicMode, StreamKind } from '../../src/generated/prisma/client';

vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: vi.fn(),
}));

import {
  buildExpiredStreamReminderMessage,
  buildStreamAnnouncementChangePreview,
  buildStreamAnnouncementMessages,
  buildStreamAnnouncementReminderButton,
  buildStreamAnnouncementReminderMessage,
  buildStreamAnnouncementReviewMessage,
  buildStreamInfoEmbed,
  buildStreamReminderButton,
} from '../../src/modules/stream-info/stream-info.discord';
import type {
  StreamInfoResult,
  StreamOccurrence,
} from '../../src/modules/stream-info/stream-info.types';
import { getEmbedFieldValue } from '../utils/discord-output';

const makeOccurrence = (
  overrides: Partial<StreamOccurrence> = {},
): StreamOccurrence => ({
  dateKey: '2026-06-12',
  weekday: 'FRIDAY',
  startAt: new Date('2026-06-12T18:10:00.000Z'),
  endAt: new Date('2026-06-12T22:10:00.000Z'),
  streamKind: StreamKind.GAME,
  musicMode: null,
  title: 'Game Stream',
  customTitle: null,
  musicTheme: null,
  gameName: 'Test Game',
  isOverride: false,
  ...overrides,
});

const embedJson = (embed: EmbedBuilder) => embed.toJSON();

describe('stream info discord output', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the stream label plain and the YouTube title clickable', () => {
    vi.setSystemTime(new Date('2026-06-12T18:00:00.000Z'));

    const embed = buildStreamInfoEmbed({
      timezone: 'America/Sao_Paulo',
      current: makeOccurrence({
        streamUrl: 'https://youtube.test/watch?v=stream',
        videoTitle: 'Dark Souls III but the bosses are unionizing',
      }),
      previous: null,
      next: null,
    });

    const currentValue = getEmbedFieldValue(embed, 'Current stream');

    expect(embedJson(embed).title).toBe('Stream Info');
    expect(currentValue).toContain('Game Stream');
    expect(currentValue).toContain(
      '[Dark Souls III but the bosses are unionizing](https://youtube.test/watch?v=stream)',
    );
    expect(currentValue).toContain('(starts <t:1781287800:R>)');
    expect(currentValue).toContain('Game: Test Game');
    expect(getEmbedFieldValue(embed, 'Next stream')).toBe(
      'No upcoming stream found.',
    );
  });

  it('offers a reminder button while an announced stream starts within two hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T16:10:00.000Z'));

    const upcoming = makeOccurrence({
      streamUrl: 'https://youtube.test/watch?v=stream',
      videoTitle: 'Upcoming Stream',
      streamIsLive: false,
    });

    expect(buildStreamReminderButton(upcoming)?.toJSON()).toMatchObject({
      components: [
        {
          custom_id: 'stream-reminder:2026-06-12',
          label: 'Remind Me',
        },
      ],
    });
    expect(
      buildStreamReminderButton({ ...upcoming, streamIsLive: true }),
    ).toBeNull();
  });

  it('keeps a reminder button on an upload announcement outside the short reminder window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T18:10:00.000Z'));

    expect(
      buildStreamAnnouncementReminderButton(makeOccurrence())?.toJSON(),
    ).toMatchObject({
      components: [
        {
          custom_id: 'stream-reminder:2026-06-12',
          label: 'Remind Me',
        },
      ],
    });
  });

  it('separates the stream-info embed from the native YouTube preview message', () => {
    const occurrence = makeOccurrence({
      streamUrl: 'https://youtube.test/watch?v=stream',
      videoTitle: 'Upcoming Stream',
    });
    const streamInfo: StreamInfoResult = {
      timezone: 'America/Sao_Paulo',
      current: null,
      previous: null,
      next: occurrence,
    };

    const messages = buildStreamAnnouncementMessages({
      occurrence,
      roleId: 'video-role',
      streamInfo,
    });

    expect(messages.link.content).toBe(
      '<@&video-role>\nhttps://youtube.test/watch?v=stream',
    );
    expect(messages.link.allowedMentions).toEqual({ roles: ['video-role'] });
    expect(messages.link).not.toHaveProperty('embeds');
    expect(messages.info.embeds).toHaveLength(1);
    expect(messages.info.components).toHaveLength(1);
    expect(messages.info).not.toHaveProperty('content');
  });

  it('supports a direct user ping for staging YouTube previews', () => {
    const occurrence = makeOccurrence({
      streamUrl: 'https://youtube.test/watch?v=stream',
    });
    const messages = buildStreamAnnouncementMessages({
      occurrence,
      streamInfo: {
        timezone: 'America/Sao_Paulo',
        current: null,
        previous: null,
        next: occurrence,
      },
      userId: 'review-user',
    });

    expect(messages.link.content).toBe(
      '<@review-user>\nhttps://youtube.test/watch?v=stream',
    );
    expect(messages.link.allowedMentions).toEqual({ users: ['review-user'] });
  });

  it('builds the personal review reminder with automatic approve and decline controls', () => {
    const occurrence = makeOccurrence();
    const streamInfo: StreamInfoResult = {
      timezone: 'America/Sao_Paulo',
      current: null,
      previous: null,
      next: occurrence,
    };

    const message = buildStreamAnnouncementReviewMessage(
      'user-1',
      streamInfo,
      occurrence,
    );

    expect(message.content).toContain('<@user-1>');
    const actionRow = message.components?.[0];
    if (!actionRow || !('toJSON' in actionRow)) {
      throw new Error('Expected an action row builder.');
    }
    expect(actionRow.toJSON()).toMatchObject({
      components: [
        { custom_id: 'stream-announcement-auto-approve:2026-06-12' },
        { custom_id: 'stream-announcement-auto-decline:2026-06-12' },
      ],
    });
  });

  it('builds an approved-change preview without any mentions', () => {
    const message = buildStreamAnnouncementChangePreview({
      action: 'PUSH',
      requestId: 'request-1',
      roleId: 'video-role',
      streamInfo: {
        timezone: 'America/Sao_Paulo',
        current: null,
        previous: null,
        next: makeOccurrence(),
      },
      streamUrl: 'https://youtube.test/watch?v=stream',
    });

    expect(message.content).toBe(
      '<@&video-role>\nhttps://youtube.test/watch?v=stream\nPush this announcement?',
    );
    expect(message.allowedMentions).toEqual({ parse: [] });
    expect(message.components[0]?.toJSON()).toMatchObject({
      components: [
        {
          custom_id: 'stream-announcement-change-approve:request-1',
          label: 'Approve Push',
        },
        {
          custom_id: 'stream-announcement-change-decline:request-1',
          label: 'Decline',
        },
      ],
    });
  });

  it('offers the same reminder button before a scheduled stream has a URL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T16:10:00.000Z'));

    expect(
      buildStreamReminderButton(
        makeOccurrence({
          streamUrl: undefined,
          videoTitle: undefined,
          streamIsLive: undefined,
        }),
      )?.toJSON(),
    ).toMatchObject({
      components: [
        {
          custom_id: 'stream-reminder:2026-06-12',
          label: 'Remind Me',
        },
      ],
    });
  });

  it('hides the reminder button before the two hour reminder window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T16:09:59.000Z'));

    expect(
      buildStreamReminderButton(
        makeOccurrence({
          streamUrl: 'https://youtube.test/watch?v=stream',
          videoTitle: 'Upcoming Stream',
          streamIsLive: false,
        }),
      ),
    ).toBeNull();
  });

  it('lets a pre-stream subscriber disable the later live reminder', () => {
    expect(
      buildStreamAnnouncementReminderMessage(
        'https://youtube.test/watch?v=stream',
        new Date('2026-06-12T18:10:00.000Z'),
        'reminder-1',
        true,
        false,
        'guild-1',
      ),
    ).toMatchObject({
      components: [
        {
          components: [
            {
              content:
                '# Stream starts <t:1781287800:R>\n**Live reminder: On**\n**All future streams: Off**',
            },
            {
              components: [
                expect.objectContaining({ label: 'Open Stream' }),
                expect.objectContaining({
                  customId: 'stream-live-alert-disable:reminder-1',
                  label: 'Disable Live Reminder',
                }),
                expect.objectContaining({
                  customId: 'stream-permanent-enable:guild-1:reminder-1',
                  label: 'Remind Me for All Future Streams',
                }),
              ],
            },
          ],
        },
      ],
    });
  });

  it('lets the subscriber re-enable the live reminder', () => {
    expect(
      buildStreamAnnouncementReminderMessage(
        'https://youtube.test/watch?v=stream',
        new Date('2026-06-12T18:10:00.000Z'),
        'reminder-1',
        false,
        true,
        'guild-1',
      ),
    ).toMatchObject({
      components: [
        {
          components: [
            {
              content:
                '# Stream starts <t:1781287800:R>\n**Live reminder: Off**\n**All future streams: On**',
            },
            {
              components: [
                expect.objectContaining({ label: 'Open Stream' }),
                expect.objectContaining({
                  customId: 'stream-live-alert-enable:reminder-1',
                  label: 'Enable Live Reminder',
                }),
                expect.objectContaining({
                  customId: 'stream-permanent-disable:guild-1:reminder-1',
                  label: 'Disable All Future Reminders',
                }),
              ],
            },
          ],
        },
      ],
    });
  });

  it('offers a permanent reminder toggle when a stream reminder has expired', () => {
    const disabled = buildExpiredStreamReminderMessage('guild-1', false);
    const enabled = buildExpiredStreamReminderMessage('guild-1', true);

    expect(disabled.content).toBe(
      'That stream is no longer available for reminders.\nCurrently you have all future reminders turned off.',
    );
    expect(enabled.content).toBe(
      'That stream is no longer available for reminders.\nCurrently you have all future reminders turned on.',
    );
    expect(disabled.components[0]?.toJSON()).toMatchObject({
      components: [
        expect.objectContaining({
          custom_id: 'stream-expired-permanent-enable:guild-1',
          label: 'Remind Me for All Future Streams',
        }),
      ],
    });
    expect(enabled.components[0]?.toJSON()).toMatchObject({
      components: [
        expect.objectContaining({
          custom_id: 'stream-expired-permanent-disable:guild-1',
          label: 'Disable All Future Reminders',
        }),
      ],
    });
  });

  it('uses a stable YouTube link label when the video title is absent', () => {
    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: makeOccurrence({
          streamUrl: 'https://youtube.test/watch?v=stream',
        }),
        previous: null,
        next: null,
      }),
      'Current stream',
    );

    expect(value).toContain(
      '[Watch on YouTube](https://youtube.test/watch?v=stream)',
    );
  });

  it('marks live current streams with started relative text', () => {
    vi.setSystemTime(new Date('2026-06-12T18:20:00.000Z'));

    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: makeOccurrence({ streamIsLive: true }),
        previous: null,
        next: null,
      }),
      'Current stream',
    );

    expect(value).toContain('started <t:1781287800:R>');
  });

  it('keeps delayed upcoming streams at a one-minute countdown', () => {
    vi.setSystemTime(new Date('2026-06-12T18:20:00.000Z'));

    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: makeOccurrence({ streamIsLive: false }),
        previous: null,
        next: null,
      }),
      'Current stream',
    );

    expect(value).toContain('starts <t:1781288460:R>');
  });

  it('keeps next stream labels plain and hides non-dictatorship music game names', () => {
    const embed = buildStreamInfoEmbed({
      timezone: 'America/Sao_Paulo',
      current: null,
      previous: null,
      next: makeOccurrence({
        streamKind: StreamKind.MUSIC,
        musicMode: MusicMode.DEMOCRACY,
        title: 'Democracy Stream',
        gameName: 'Hidden Game',
        streamUrl: 'https://youtube.test/watch?v=next',
      }),
    });

    const value = getEmbedFieldValue(embed, 'Next stream');

    expect(value).toContain('Democracy Stream');
    expect(value).not.toContain('Game: Hidden Game');
  });

  it('shows combined music-first streams with the later game', () => {
    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: makeOccurrence({
          streamKind: StreamKind.MUSIC,
          musicMode: MusicMode.PATREON_CAPITALISM,
          title: 'Patreon Capitalism Stream',
          musicTheme: 'Patreon Masters Tier',
          gameName: 'Onimusha: Way of the Sword',
          isCombined: true,
        }),
        previous: null,
        next: null,
      }),
      'Current stream',
    );

    expect(value).toContain(
      'Combined Stream: Patreon Capitalism Stream + Game Stream',
    );
    expect(value).toContain('Game later: Onimusha: Way of the Sword');
  });

  it('shows a custom title as secondary context without hiding music mode', () => {
    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: null,
        previous: null,
        next: makeOccurrence({
          streamKind: StreamKind.MUSIC,
          musicMode: MusicMode.DEMOCRACY,
          title: 'Democracy Stream',
          customTitle: 'PACIFISM',
          musicTheme: 'Peace songs',
        }),
      }),
      'Next stream',
    );

    expect(value?.split('\n')).toEqual([
      'Democracy Stream',
      'Title: PACIFISM',
      'Theme: Peace songs',
      '<t:1781287800:F> (<t:1781287800:R>)',
    ]);
  });

  it('does not show a music theme on game streams', () => {
    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: null,
        previous: null,
        next: makeOccurrence({ musicTheme: 'Hidden theme' }),
      }),
      'Next stream',
    );

    expect(value).not.toContain('Theme:');
  });

  it('shows game names for dictatorship music streams', () => {
    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: null,
        previous: null,
        next: makeOccurrence({
          streamKind: StreamKind.MUSIC,
          musicMode: MusicMode.DICTATORSHIP,
          title: 'Dictatorship Stream',
          gameName: 'Shown Game',
        }),
      }),
      'Next stream',
    );

    expect(value).toContain('Game: Shown Game');
  });

  it('renders fallback next stream text when no stream exists', () => {
    const data: StreamInfoResult = {
      timezone: 'America/Sao_Paulo',
      current: null,
      previous: null,
      next: null,
    };

    expect(getEmbedFieldValue(buildStreamInfoEmbed(data), 'Next stream')).toBe(
      'No upcoming stream found.',
    );
  });
});
