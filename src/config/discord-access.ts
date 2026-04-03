import { env } from '@zod-schemas/env.zod';
import { PermissionFlagsBits, type PermissionsString } from 'discord.js';

export type BotGuildId = string & { readonly __brand: unique symbol };

const asBotGuildId = (value: string): BotGuildId => value as BotGuildId;

export const BOT_GUILDS = {
  STAGING_ENV: asBotGuildId(env.DISCORD_STAGING_ENV_GUILD_ID),
  PROD_ENV: asBotGuildId(env.DISCORD_PROD_ENV_GUILD_ID),
} as const;

export const COMMAND_GUILDS = {
  STREAM_INFO: [BOT_GUILDS.STAGING_ENV, BOT_GUILDS.PROD_ENV],
  HELLO: [BOT_GUILDS.STAGING_ENV],

  SET_GAME: [BOT_GUILDS.STAGING_ENV, BOT_GUILDS.PROD_ENV],
  SET_STREAM_INFO: [BOT_GUILDS.STAGING_ENV, BOT_GUILDS.PROD_ENV],
  RESET_TITLE: [BOT_GUILDS.STAGING_ENV, BOT_GUILDS.PROD_ENV],
  RESET_STREAM_INFO: [BOT_GUILDS.STAGING_ENV, BOT_GUILDS.PROD_ENV],

  DAVI_SET_GAME: [BOT_GUILDS.STAGING_ENV],
  DAVI_SET_STREAM_INFO: [BOT_GUILDS.STAGING_ENV],
  DAVI_RESET_TITLE: [BOT_GUILDS.STAGING_ENV],
  DAVI_RESET_STREAM_INFO: [BOT_GUILDS.STAGING_ENV],
} as const satisfies Record<string, readonly BotGuildId[]>;

const KNOWN_BOT_GUILD_IDS = new Set<BotGuildId>([
  BOT_GUILDS.STAGING_ENV,
  BOT_GUILDS.PROD_ENV,
]);

export const ADMIN_COMMAND_PERMISSION = PermissionFlagsBits.ManageGuild;
export const ADMIN_COMMAND_PERMISSION_NAME: PermissionsString = 'ManageGuild';

export const isKnownBotGuild = (guildId: string): guildId is BotGuildId =>
  KNOWN_BOT_GUILD_IDS.has(guildId as BotGuildId);

export const isAllowedGuildForCommand = <
  TAllowedGuildIds extends readonly BotGuildId[],
>(
  guildId: string,
  allowedGuildIds: TAllowedGuildIds,
): guildId is TAllowedGuildIds[number] =>
  allowedGuildIds.includes(guildId as TAllowedGuildIds[number]);
