import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BOT_GUILDS } from '../../config/discord-access';
import { env } from '../../types/zod-schemas/env.zod';
import { buildEmbeddedAppActivityUrl } from './embedded-app-link';

export const EMBEDDED_APP_STATS_CUSTOM_ID = 'embedded-app-stats';
const MAX_COMPONENT_CUSTOM_ID_LENGTH = 100;

export const parseEmbeddedAppStatsButton = (customId: string) => {
  if (customId === EMBEDDED_APP_STATS_CUSTOM_ID) {
    return { gameName: null };
  }

  const gamePrefix = `${EMBEDDED_APP_STATS_CUSTOM_ID}:`;

  if (!customId.startsWith(gamePrefix)) {
    return null;
  }

  const gameName = customId.slice(gamePrefix.length).trim();
  return gameName ? { gameName } : null;
};

export const buildEmbeddedAppStatsButton = (
  guildId: string,
  gameName?: string | null,
): ActionRowBuilder<ButtonBuilder> | null => {
  const isEmbeddedAppGuild =
    guildId === BOT_GUILDS.STAGING_ENV || guildId === BOT_GUILDS.PROD_ENV;

  if (!isEmbeddedAppGuild) {
    return null;
  }

  const button = new ButtonBuilder().setLabel('Stats').setEmoji('\u{1F4CA}');

  if (guildId === BOT_GUILDS.PROD_ENV) {
    button
      .setStyle(ButtonStyle.Link)
      .setURL(buildEmbeddedAppActivityUrl(env.DISCORD_CLIENT_ID, gameName));

    return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  }

  const cleanGameName = gameName?.trim();
  const targetedCustomId = cleanGameName
    ? `${EMBEDDED_APP_STATS_CUSTOM_ID}:${cleanGameName}`
    : EMBEDDED_APP_STATS_CUSTOM_ID;
  const customId =
    targetedCustomId.length <= MAX_COMPONENT_CUSTOM_ID_LENGTH
      ? targetedCustomId
      : EMBEDDED_APP_STATS_CUSTOM_ID;

  button.setCustomId(customId).setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
};
