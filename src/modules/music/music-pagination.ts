import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type MessageEditOptions,
  MessageFlags,
} from 'discord.js';
import {
  expireComponentLifetime,
  registerComponentLifetime,
} from '../discord/component-lifecycle';
import type {
  MusicPaginationInput,
  MusicPaginationSession,
} from './music.types';
import { buildMusicActivityButton } from './music-activity.discord';

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
  const activity = session.activityQuery
    ? buildMusicActivityButton(session.guildId, {
        query: session.activityQuery,
        game: true,
      })
    : null;
  const components = session.pages.length > 1 ? [buttons] : [];
  if (activity) components.push(activity);
  return {
    content: session.pages[safePage] ?? '',
    embeds: [],
    flags: MessageFlags.SuppressEmbeds,
    allowedMentions: { parse: [] },
    components,
  } satisfies MessageEditOptions;
};

export const createMusicSearchPagination = (input: MusicPaginationInput) => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(id);
      void expireComponentLifetime(`${prefix}:${id}`);
    }
  }
  const id = randomUUID();
  const session = { ...input, expiresAt: now + sessionLifetime };
  if (input.pages.length > 1) {
    if (sessions.size >= maxSessions) {
      const oldest = sessions.keys().next().value;
      if (oldest) {
        sessions.delete(oldest);
        void expireComponentLifetime(`${prefix}:${oldest}`);
      }
    }
    sessions.set(id, session);
    registerComponentLifetime(`${prefix}:${id}`, session.expiresAt);
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
    void expireComponentLifetime(`${prefix}:${id}`);
    return interaction.update({ components: [] });
  }
  if (interaction.guildId !== session.guildId) {
    return interaction.reply({
      content:
        'These music search buttons belong to another server. Run /music-search here for a new list.',
      flags: MessageFlags.Ephemeral,
    });
  }
  const reply = buildPage(session, id, page);
  if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
    return interaction.update(reply);
  }
  return interaction.reply({
    ...reply,
    flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
  });
};
