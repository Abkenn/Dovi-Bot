import { env } from '@zod-schemas/env.zod';
import { PermissionFlagsBits } from 'discord.js';
import type { Tagged } from 'type-fest';

export type BotGuildId = Tagged<string, 'BotGuildId'>;

const asBotGuildId = (value: string): BotGuildId => value as BotGuildId;

const maybeProdEnvGuild = env.ENABLE_PROD_GUILD_COMMAND_REGISTRATION
  ? [asBotGuildId(env.DISCORD_PROD_ENV_GUILD_ID)]
  : [];

export const BOT_GUILDS = {
  STAGING_ENV: asBotGuildId(env.DISCORD_STAGING_ENV_GUILD_ID),
  PROD_ENV: asBotGuildId(env.DISCORD_PROD_ENV_GUILD_ID),
} as const;

export const COMMAND_GUILDS = {
  HELP: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  STREAM_INFO: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  HELLO: [BOT_GUILDS.STAGING_ENV],
  BOT_STATUS: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  PING_ME: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],

  POLL_HOST: [BOT_GUILDS.STAGING_ENV],
  POLL_NOMINATE: [BOT_GUILDS.STAGING_ENV],
  POLL_START: [BOT_GUILDS.STAGING_ENV],
  POLL_STATUS: [BOT_GUILDS.STAGING_ENV],
  POLL_MANAGE: [BOT_GUILDS.STAGING_ENV],

  SET_GAME: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  SET_STREAM_INFO: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  RESET_TITLE: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  RESET_STREAM_INFO: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  SKIP_STREAM: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  BOSS_TRIAL: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  BOSS_TRIAL_STATS: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  GAME_DISCUSSION_STATS: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  SHOW_BOSS_STATS: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  SHOW_GAME_STATS: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  SYNC_DAVI_BOSS_STATS: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  TRACK_BOSS_START: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  TRACK_BOSS_DEATH: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  TRACK_BOSS_PAUSE: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  TRACK_BOSS_RESUME: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  TRACK_BOSS_END: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  TRACK_BOSS_STATUS: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  TRACK_GAME_STATUS: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  TRACK_BOSS_CANCEL: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  UPDATE_BOSS_INFO: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],
  UPDATE_GAME_INFO: [BOT_GUILDS.STAGING_ENV, ...maybeProdEnvGuild],

  DAVI_SET_GAME: [BOT_GUILDS.STAGING_ENV],
  DAVI_SET_STREAM_INFO: [BOT_GUILDS.STAGING_ENV],
  DAVI_RESET_TITLE: [BOT_GUILDS.STAGING_ENV],
  DAVI_RESET_STREAM_INFO: [BOT_GUILDS.STAGING_ENV],
  DAVI_SKIP_STREAM: [BOT_GUILDS.STAGING_ENV],
  DAVI_STREAM_INFO: [BOT_GUILDS.STAGING_ENV],
  DAVI_BOSS_TRIAL_STATS: [BOT_GUILDS.STAGING_ENV],
  DAVI_SYNC_BOSS_STATS: [BOT_GUILDS.STAGING_ENV],
  DAVI_COMMUNITY_TOPIC_STATS: [BOT_GUILDS.STAGING_ENV],
} as const satisfies Record<string, readonly BotGuildId[]>;

export const ADMIN_COMMAND_PERMISSION = PermissionFlagsBits.ManageGuild;

export const isAllowedGuildForCommand = <
  TAllowedGuildIds extends readonly BotGuildId[],
>(
  guildId: string,
  allowedGuildIds: TAllowedGuildIds,
): guildId is TAllowedGuildIds[number] =>
  allowedGuildIds.includes(guildId as TAllowedGuildIds[number]);
