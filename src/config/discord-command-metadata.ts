import { type BotGuildId, COMMAND_GUILDS } from './discord-access';

export const HELP_AUDIENCES = {
  PUBLIC: 'public',
  ADMIN: 'admin',
} as const;

export const HELP_CATEGORIES = {
  HELP: 'Help',
  GENERAL: 'General',
  STREAM_INFO: 'Stream Info',
  BOSSES: 'Bosses',
  BOSS_TRIALS: 'Boss Trials',
  STAGING: 'Staging',
} as const;

type CommandHelpAudience = (typeof HELP_AUDIENCES)[keyof typeof HELP_AUDIENCES];
type CommandHelpCategory =
  (typeof HELP_CATEGORIES)[keyof typeof HELP_CATEGORIES];

export type CommandMetadata = {
  name: string;
  description: string;
  guildIds: readonly BotGuildId[];
  helpAudience: CommandHelpAudience;
  helpCategory: CommandHelpCategory;
};

export const COMMAND_METADATA = {
  HELP: {
    name: 'help',
    description: 'Shows information and help for commands.',
    guildIds: COMMAND_GUILDS.HELP,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: HELP_CATEGORIES.HELP,
  },
  HELLO: {
    name: 'hello',
    description: 'Replies with a greeting.',
    guildIds: COMMAND_GUILDS.HELLO,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: HELP_CATEGORIES.GENERAL,
  },
  STREAM_INFO: {
    name: 'streaminfo',
    description: 'Shows current and next stream information.',
    guildIds: COMMAND_GUILDS.STREAM_INFO,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: HELP_CATEGORIES.STREAM_INFO,
  },
  SHOW_BOSS_STATS: {
    name: 'showbossstats',
    description: "Shows Davi's stored stats for a boss.",
    guildIds: COMMAND_GUILDS.SHOW_BOSS_STATS,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: HELP_CATEGORIES.BOSSES,
  },
  BOSS_TRIAL: {
    name: 'bosstrial',
    description: 'Starts a community verdict vote for a boss.',
    guildIds: COMMAND_GUILDS.BOSS_TRIAL,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: HELP_CATEGORIES.BOSS_TRIALS,
  },
  BOSS_TRIAL_STATS: {
    name: 'bosstrialstats',
    description: 'Shows boss trial history and leaderboards for this server.',
    guildIds: COMMAND_GUILDS.BOSS_TRIAL_STATS,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: HELP_CATEGORIES.BOSS_TRIALS,
  },
  SET_GAME: {
    name: 'setgame',
    description: 'Sets the default game for future regular game streams.',
    guildIds: COMMAND_GUILDS.SET_GAME,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STREAM_INFO,
  },
  SET_STREAM_INFO: {
    name: 'setstreaminfo',
    description:
      'Updates the current stream if ongoing, otherwise the next stream.',
    guildIds: COMMAND_GUILDS.SET_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STREAM_INFO,
  },
  RESET_TITLE: {
    name: 'resettitle',
    description: 'Resets custom title override for current/next stream.',
    guildIds: COMMAND_GUILDS.RESET_TITLE,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STREAM_INFO,
  },
  RESET_STREAM_INFO: {
    name: 'resetstreaminfo',
    description:
      'Resets stream override (type, game, title, etc.) for current/next.',
    guildIds: COMMAND_GUILDS.RESET_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STREAM_INFO,
  },
  SYNC_DAVI_BOSS_STATS: {
    name: 'syncbossstats',
    description: 'Syncs Davi boss stats from the Abramo Docs.',
    guildIds: COMMAND_GUILDS.SYNC_DAVI_BOSS_STATS,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.BOSSES,
  },
  DAVI_STREAM_INFO: {
    name: 'davistreaminfo',
    description: 'Shows prod env stream information from staging.',
    guildIds: COMMAND_GUILDS.DAVI_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STAGING,
  },
  DAVI_SET_GAME: {
    name: 'davisetgame',
    description: 'Sets the prod env default game from staging.',
    guildIds: COMMAND_GUILDS.DAVI_SET_GAME,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STAGING,
  },
  DAVI_SET_STREAM_INFO: {
    name: 'davisetstreaminfo',
    description: 'Updates the prod env current/next stream from staging.',
    guildIds: COMMAND_GUILDS.DAVI_SET_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STAGING,
  },
  DAVI_RESET_TITLE: {
    name: 'daviresettitle',
    description: 'Resets title override for prod env current/next stream.',
    guildIds: COMMAND_GUILDS.DAVI_RESET_TITLE,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STAGING,
  },
  DAVI_RESET_STREAM_INFO: {
    name: 'daviresetstreaminfo',
    description: 'Resets all overrides for prod env current/next stream.',
    guildIds: COMMAND_GUILDS.DAVI_RESET_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STAGING,
  },
  DAVI_BOSS_TRIAL_STATS: {
    name: 'davibosstrialstats',
    description: 'Shows prod env boss trial stats from staging.',
    guildIds: COMMAND_GUILDS.DAVI_BOSS_TRIAL_STATS,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STAGING,
  },
  DAVI_SYNC_BOSS_STATS: {
    name: 'davisyncbossstats',
    description: 'Syncs prod env boss stats from staging.',
    guildIds: COMMAND_GUILDS.DAVI_SYNC_BOSS_STATS,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: HELP_CATEGORIES.STAGING,
  },
} as const satisfies Record<string, CommandMetadata>;

export const HELP_COMMANDS = Object.values(COMMAND_METADATA);
