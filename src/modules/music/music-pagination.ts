import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import type {
  MusicPaginationInput,
  MusicPaginationSession,
} from './music.types';

const sessions = new Map<string, MusicPaginationSession>();
const prefix = 'music-page';
const sessionLifetime = 60 * 60 * 1000;
const maxSessions = 1_000;

const buildPage = (
  session: MusicPaginationSession,
  id: string,
  page: number,
) => {
  const safePage = Math.min(page, session.pages.length - 1);
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}:${id}:${Math.max(0, safePage - 1)}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === 0),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${id}:${safePage + 1}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === session.pages.length - 1),
  );
  return {
    content: session.pages[safePage] ?? '',
    allowedMentions: { parse: [] },
    components: session.pages.length > 1 ? [buttons] : [],
  };
};

export const createMusicSearchPagination = (input: MusicPaginationInput) => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
  const id = randomUUID();
  const session = { ...input, expiresAt: now + sessionLifetime };
  if (input.pages.length > 1) {
    if (sessions.size >= maxSessions) {
      const oldest = sessions.keys().next().value;
      if (oldest) sessions.delete(oldest);
    }
    sessions.set(id, session);
  }
  return buildPage(session, id, 0);
};

export const handleMusicSearchPage = async (interaction: ButtonInteraction) => {
  const [action, id, pageText, extra] = interaction.customId.split(':');
  const page = Number(pageText);
  if (
    action !== prefix ||
    !id ||
    !pageText ||
    extra !== undefined ||
    !Number.isSafeInteger(page) ||
    page < 0
  )
    return;
  const session = sessions.get(id);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return interaction.reply({
      content:
        'These music search buttons have expired. Run /music-search again to browse all tracks.',
      flags: MessageFlags.Ephemeral,
    });
  }
  if (
    interaction.user.id !== session.requesterUserId ||
    interaction.guildId !== session.guildId
  ) {
    return interaction.reply({
      content:
        'Only the person who searched can change these pages. Run /music-search for your own list.',
      flags: MessageFlags.Ephemeral,
    });
  }
  return interaction.update(buildPage(session, id, page));
};
