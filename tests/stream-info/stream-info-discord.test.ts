import type { EmbedBuilder } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicMode, StreamKind } from '../../src/generated/prisma/client';

vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: vi.fn(),
}));

import {
  buildEmbeddedAppStatsButton,
  buildStreamAnnouncementReminderMessage,
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
  gameName: 'Test Game',
  isOverride: false,
  ...overrides,
});

const embedJson = (embed: EmbedBuilder) => embed.toJSON();

describe('stream info discord output', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses a linked current stream field for public pre-stream URLs', () => {
    vi.setSystemTime(new Date('2026-06-12T18:00:00.000Z'));

    const embed = buildStreamInfoEmbed({
      timezone: 'America/Sao_Paulo',
      current: makeOccurrence({
        streamUrl: 'https://youtube.test/watch?v=stream',
        videoTitle: 'Dark Souls III but the bosses are unionizing',
      }),
      next: null,
    });

    const currentValue = getEmbedFieldValue(
      embed,
      '[Current stream](https://youtube.test/watch?v=stream)',
    );

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

  it('offers the embedded stats app only from staging stream info', () => {
    expect(
      buildEmbeddedAppStatsButton('staging-guild', 'staging-guild')?.toJSON(),
    ).toMatchObject({
      components: [
        {
          custom_id: 'embedded-app-stats',
          label: 'Stats',
        },
      ],
    });
    expect(
      buildEmbeddedAppStatsButton('production-guild', 'staging-guild'),
    ).toBeNull();
  });

  it('lets a pre-stream subscriber disable the later live alert', () => {
    expect(
      buildStreamAnnouncementReminderMessage(
        'https://youtube.test/watch?v=stream',
        new Date('2026-06-12T18:10:00.000Z'),
        'reminder-1',
        true,
      ),
    ).toMatchObject({
      components: [
        {
          components: [
            {
              content:
                '# Stream starts <t:1781287800:R>\n**Live reminder: On**',
            },
            {
              components: [
                expect.objectContaining({ label: 'Open Stream' }),
                expect.objectContaining({
                  customId: 'stream-live-alert-disable:reminder-1',
                  label: 'Skip Live Reminder',
                }),
              ],
            },
          ],
        },
      ],
    });
  });

  it('shows the disabled state after opting out of the live alert', () => {
    expect(
      buildStreamAnnouncementReminderMessage(
        'https://youtube.test/watch?v=stream',
        new Date('2026-06-12T18:10:00.000Z'),
        'reminder-1',
        false,
      ),
    ).toMatchObject({
      components: [
        {
          components: [
            {
              content:
                '# Stream starts <t:1781287800:R>\n**Live reminder: Off**',
            },
            {
              components: [expect.objectContaining({ label: 'Open Stream' })],
            },
          ],
        },
      ],
    });
  });

  it('does not add an unlabeled video title when the YouTube title is absent', () => {
    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: makeOccurrence({
          streamUrl: 'https://youtube.test/watch?v=stream',
        }),
        next: null,
      }),
      '[Current stream](https://youtube.test/watch?v=stream)',
    );

    expect(value).not.toContain('[](');
  });

  it('marks already-started current streams with started relative text', () => {
    vi.setSystemTime(new Date('2026-06-12T18:20:00.000Z'));

    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: makeOccurrence(),
        next: null,
      }),
      'Current stream',
    );

    expect(value).toContain('started <t:1781287800:R>');
  });

  it('links next stream fields and hides non-dictatorship music game names', () => {
    const embed = buildStreamInfoEmbed({
      timezone: 'America/Sao_Paulo',
      current: null,
      next: makeOccurrence({
        streamKind: StreamKind.MUSIC,
        musicMode: MusicMode.DEMOCRACY,
        title: 'Democracy Stream',
        gameName: 'Hidden Game',
        streamUrl: 'https://youtube.test/watch?v=next',
      }),
    });

    const value = getEmbedFieldValue(
      embed,
      '[Next stream](https://youtube.test/watch?v=next)',
    );

    expect(value).toContain('Democracy Stream');
    expect(value).not.toContain('Game: Hidden Game');
  });

  it('shows game names for dictatorship music streams', () => {
    const value = getEmbedFieldValue(
      buildStreamInfoEmbed({
        timezone: 'America/Sao_Paulo',
        current: null,
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
      next: null,
    };

    expect(getEmbedFieldValue(buildStreamInfoEmbed(data), 'Next stream')).toBe(
      'No upcoming stream found.',
    );
  });
});
