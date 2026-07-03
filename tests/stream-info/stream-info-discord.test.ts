import type { EmbedBuilder } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicMode, StreamKind } from '../../src/generated/prisma/client';

vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: vi.fn(),
}));

import { buildStreamInfoEmbed } from '../../src/modules/stream-info/stream-info.discord';
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
