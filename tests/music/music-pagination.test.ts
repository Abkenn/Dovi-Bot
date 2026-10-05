import { MessageFlags, MessageFlagsBitField } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMusicGamePages } from '../../src/modules/music/music.discord';

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { PROD_ENV: 'prod', STAGING_ENV: 'staging' },
}));

import {
  createMusicSearchPagination,
  handleMusicSearchPage,
} from '../../src/modules/music/music-pagination';

const results = Array.from({ length: 44 }, (_, index) => ({
  title: `Track ${index} - TH17 WBaWC`,
  game: 'Touhou Series',
  count: index + 1,
  streamDate: '2026-09-11',
  offsetSeconds: index * 60,
  video: { videoId: 'abcdefghijk', title: 'Music stream' },
}));

const button = (
  reply: ReturnType<typeof createMusicSearchPagination>,
  index: number,
) => {
  const data = reply.components?.[0]?.components[index]?.toJSON();
  if (!data || !('custom_id' in data) || !data.custom_id)
    throw new Error('Missing button');
  return { ...data, custom_id: data.custom_id };
};

describe('music search pagination', () => {
  afterEach(() => vi.useRealTimers());

  it('shows every track exactly once with intact links, counts, headings and credit under 2000 characters', () => {
    const pages = buildMusicGamePages(results, 'touhou');
    expect(pages.length).toBeGreaterThan(1);
    const lines = pages.flatMap((page) =>
      page.split('\n').filter((line) => line.startsWith('* [')),
    );
    expect(lines).toHaveLength(results.length);
    results.forEach((result, index) => {
      expect(lines[index]).toContain(
        `[${result.title}](<https://www.youtube.com/watch?v=abcdefghijk&t=${result.offsetSeconds}s>)`,
      );
      expect(lines[index]).toContain(`heard ${result.count}`);
    });
    pages.forEach((page, index) => {
      expect(page.length).toBeLessThanOrEqual(2000);
      expect(page).toContain(`Page ${index + 1} of ${pages.length}`);
      expect(page.startsWith('**Touhou Series**')).toBe(true);
      expect(page.endsWith('*Data collected by <@632504207441920011>.*')).toBe(
        true,
      );
      expect(page).not.toContain('narrow the results');
    });
  });

  it('keeps a single oversized track and heading within the limit without breaking its link', () => {
    const pages = buildMusicGamePages([
      {
        title: '*'.repeat(4000),
        game: 'g'.repeat(4000),
        count: 1,
        streamDate: '2026-09-11',
        offsetSeconds: 0,
        video: { videoId: 'abcdefghijk', title: 'Music stream' },
      },
    ]);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.length).toBeLessThanOrEqual(2000);
    expect(pages[0]).toContain(
      '](<https://www.youtube.com/watch?v=abcdefghijk&t=0s>)',
    );
  });

  it('disables boundary buttons and navigates forward and back on the same result snapshot', async () => {
    const pages = buildMusicGamePages(results);
    let reply = createMusicSearchPagination({
      pages,
      guildId: 'staging',
    });
    expect(button(reply, 0).disabled).toBe(true);
    expect(button(reply, 1).disabled).toBe(false);
    expect(reply.flags).toBe(MessageFlags.SuppressEmbeds);
    expect(reply.embeds).toEqual([]);
    const interaction = {
      customId: button(reply, 1).custom_id,
      user: { id: 'owner' },
      guildId: 'staging',
      message: { flags: new MessageFlagsBitField() },
      update: vi.fn(async (next: typeof reply) => {
        reply = next;
      }),
      reply: vi.fn(async (next: typeof reply) => {
        reply = next;
        interaction.message.flags.add(MessageFlags.Ephemeral);
      }),
    };
    for (let page = 1; page < pages.length; page++) {
      interaction.customId = button(reply, 1).custom_id;
      await handleMusicSearchPage(interaction as never);
      expect(reply.content).toBe(pages[page]);
    }
    expect(button(reply, 1).disabled).toBe(true);
    expect(button(reply, 0).disabled).toBe(false);
    interaction.customId = button(reply, 0).custom_id;
    await handleMusicSearchPage(interaction as never);
    expect(reply.content).toBe(pages[pages.length - 2]);
    expect(reply.allowedMentions).toEqual({ parse: [] });
    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
      }),
    );
    expect(interaction.update).toHaveBeenCalledTimes(pages.length - 1);
    expect(interaction.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        flags: MessageFlags.SuppressEmbeds,
        embeds: [],
      }),
    );
  });

  it('omits controls when all tracks fit on one page', () => {
    const reply = createMusicSearchPagination({
      pages: buildMusicGamePages(results.slice(0, 1)),
      guildId: 'staging',
    });
    expect(reply.components).toEqual([]);
    expect(buildMusicGamePages([])).toEqual([]);
  });

  it('bounds stored searches and prunes expired sessions when starting another search', async () => {
    vi.useFakeTimers();
    const input = {
      pages: ['first', 'last'],
      guildId: 'staging',
    };
    const first = createMusicSearchPagination(input);
    for (let index = 0; index < 1000; index++)
      createMusicSearchPagination(input);
    const interaction = {
      customId: button(first, 1).custom_id,
      user: { id: 'owner' },
      guildId: 'staging',
      message: { flags: new MessageFlagsBitField(MessageFlags.Ephemeral) },
      update: vi.fn(),
      reply: vi.fn(),
    };
    await handleMusicSearchPage(interaction as never);
    expect(interaction.update).toHaveBeenCalledWith({ components: [] });
    vi.advanceTimersByTime(60 * 60 * 1000);
    const fresh = createMusicSearchPagination(input);
    const id = button(fresh, 1).custom_id.split(':')[1];
    interaction.customId = `music-page:${id}:999`;
    await handleMusicSearchPage(interaction as never);
    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'last' }),
    );
  });

  it('lets any user open an independent private page without changing the public message', async () => {
    const reply = createMusicSearchPagination({
      pages: buildMusicGamePages(results),
      guildId: 'staging',
    });
    const interaction = {
      customId: button(reply, 1).custom_id,
      user: { id: 'other' },
      guildId: 'staging',
      message: { flags: new MessageFlagsBitField() },
      update: vi.fn(),
      reply: vi.fn(),
    };
    await handleMusicSearchPage(interaction as never);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Page 2 of'),
        flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
      }),
    );
    interaction.user.id = 'owner';
    await handleMusicSearchPage(interaction as never);
    expect(interaction.reply).toHaveBeenCalledTimes(2);
    expect(interaction.reply.mock.calls[0]).toEqual(
      interaction.reply.mock.calls[1],
    );
    expect(interaction.update).not.toHaveBeenCalled();
  });

  it('keeps private navigation independent between users and does not send a new reply on each click', async () => {
    const publicReply = createMusicSearchPagination({
      pages: ['first', 'second', 'third'],
      guildId: 'prod',
    });
    const alice = {
      customId: button(publicReply, 1).custom_id,
      user: { id: 'alice' },
      guildId: 'prod',
      message: { flags: new MessageFlagsBitField() },
      update: vi.fn(),
      reply: vi.fn(),
    };
    const bob = {
      ...alice,
      user: { id: 'bob' },
      update: vi.fn(),
      reply: vi.fn(),
    };
    await handleMusicSearchPage(alice as never);
    await handleMusicSearchPage(bob as never);
    const alicePage = alice.reply.mock.calls[0]?.[0];
    const bobPage = bob.reply.mock.calls[0]?.[0];
    const alicePrivate = {
      ...alice,
      customId: button(alicePage, 1).custom_id,
      message: { flags: new MessageFlagsBitField(MessageFlags.Ephemeral) },
    };
    await handleMusicSearchPage(alicePrivate as never);
    expect(alice.update).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'third' }),
    );
    expect(bobPage.content).toBe('second');
    expect(bob.update).not.toHaveBeenCalled();
    const bobPrivate = {
      ...bob,
      customId: button(bobPage, 0).custom_id,
      message: { flags: new MessageFlagsBitField(MessageFlags.Ephemeral) },
    };
    await handleMusicSearchPage(bobPrivate as never);
    expect(bob.update).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'first' }),
    );
    expect(alice.reply).toHaveBeenCalledTimes(1);
    expect(bob.reply).toHaveBeenCalledTimes(1);
    expect(publicReply.content).toBe('first');
  });

  it('rejects buttons used in a different guild', async () => {
    const reply = createMusicSearchPagination({
      pages: ['first', 'second'],
      guildId: 'staging',
    });
    const interaction = {
      customId: button(reply, 1).custom_id,
      guildId: 'staging',
      update: vi.fn(),
      reply: vi.fn(),
    };
    interaction.guildId = 'prod';
    await handleMusicSearchPage(interaction as never);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('another server'),
        flags: MessageFlags.Ephemeral,
      }),
    );
    expect(interaction.update).not.toHaveBeenCalled();
  });

  it('handles expired or missing sessions and ignores malformed or unrelated IDs', async () => {
    vi.useFakeTimers();
    const reply = createMusicSearchPagination({
      pages: buildMusicGamePages(results),
      guildId: 'staging',
    });
    const interaction = {
      customId: button(reply, 1).custom_id,
      user: { id: 'owner' },
      guildId: 'staging',
      update: vi.fn(),
      reply: vi.fn(),
    };
    vi.advanceTimersByTime(60 * 60 * 1000);
    await handleMusicSearchPage(interaction as never);
    expect(interaction.update).toHaveBeenCalledWith({ components: [] });
    expect(interaction.reply).not.toHaveBeenCalled();
    interaction.customId = 'music-page:missing:1';
    await handleMusicSearchPage(interaction as never);
    expect(interaction.update).toHaveBeenCalledTimes(2);
    for (const id of [
      'other:1',
      'music-page:a:-1',
      'music-page:a:NaN',
      'music-page:a:1:extra',
      'music-page::1',
    ]) {
      interaction.customId = id;
      await handleMusicSearchPage(interaction as never);
    }
    expect(interaction.update).toHaveBeenCalledTimes(2);
    expect(interaction.reply).not.toHaveBeenCalled();
  });
});
