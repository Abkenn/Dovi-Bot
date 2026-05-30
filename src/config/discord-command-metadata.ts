import { type BotGuildId, COMMAND_GUILDS } from './discord-access';
import {
  COMMAND_CATEGORIES,
  type CommandHelpCategory,
} from './discord-command-categories';

export const HELP_AUDIENCES = {
  PUBLIC: 'public',
  ADMIN: 'admin',
} as const;

type CommandHelpAudience = (typeof HELP_AUDIENCES)[keyof typeof HELP_AUDIENCES];

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
    helpCategory: COMMAND_CATEGORIES.HELP,
  },
  HELLO: {
    name: 'hello',
    description: 'Replies with a greeting.',
    guildIds: COMMAND_GUILDS.HELLO,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.GENERAL,
  },
  BOT_STATUS: {
    name: 'botstatus',
    description: 'Shows bot status.',
    guildIds: COMMAND_GUILDS.BOT_STATUS,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.HELP,
  },
  STREAM_INFO: {
    name: 'streaminfo',
    description: 'Shows current and next stream information.',
    guildIds: COMMAND_GUILDS.STREAM_INFO,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.STREAM_INFO,
  },
  SHOW_BOSS_STATS: {
    name: 'showbossstats',
    description: "Shows Davi's stored stats for a boss.",
    guildIds: COMMAND_GUILDS.SHOW_BOSS_STATS,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  BOSS_TRIAL: {
    name: 'bosstrial',
    description: 'Starts a community verdict vote for a boss.',
    guildIds: COMMAND_GUILDS.BOSS_TRIAL,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSS_TRIALS,
  },
  BOSS_TRIAL_STATS: {
    name: 'bosstrialstats',
    description: 'Shows boss trial history and leaderboards for this server.',
    guildIds: COMMAND_GUILDS.BOSS_TRIAL_STATS,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSS_TRIALS,
  },
  GAME_DISCUSSION_STATS: {
    name: 'gamediscussionstats',
    description: 'Shows community discussion stats for one game or boss.',
    guildIds: COMMAND_GUILDS.GAME_DISCUSSION_STATS,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.COMMUNITY_STATS,
  },
  SET_GAME: {
    name: 'setgame',
    description: 'Sets the default game for future regular game streams.',
    guildIds: COMMAND_GUILDS.SET_GAME,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STREAM_INFO,
  },
  SET_STREAM_INFO: {
    name: 'setstreaminfo',
    description:
      'Updates the current stream if ongoing, otherwise the next stream.',
    guildIds: COMMAND_GUILDS.SET_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STREAM_INFO,
  },
  RESET_TITLE: {
    name: 'resettitle',
    description: 'Resets custom title override for current/next stream.',
    guildIds: COMMAND_GUILDS.RESET_TITLE,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STREAM_INFO,
  },
  RESET_STREAM_INFO: {
    name: 'resetstreaminfo',
    description:
      'Resets stream override (type, game, title, etc.) for current/next.',
    guildIds: COMMAND_GUILDS.RESET_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STREAM_INFO,
  },
  SKIP_STREAM: {
    name: 'skipstream',
    description: 'Skips the current/next scheduled stream.',
    guildIds: COMMAND_GUILDS.SKIP_STREAM,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STREAM_INFO,
  },
  SYNC_DAVI_BOSS_STATS: {
    name: 'syncbossstats',
    description: 'Syncs Davi boss stats from the Abramo Docs.',
    guildIds: COMMAND_GUILDS.SYNC_DAVI_BOSS_STATS,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  TRACK_BOSS_START: {
    name: 'trackbossstart',
    description: 'Starts live boss tracking.',
    guildIds: COMMAND_GUILDS.TRACK_BOSS_START,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  TRACK_BOSS_DEATH: {
    name: 'trackbossdeath',
    description: 'Records a death and starts the next attempt.',
    guildIds: COMMAND_GUILDS.TRACK_BOSS_DEATH,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  TRACK_BOSS_PAUSE: {
    name: 'trackbosspause',
    description: 'Pauses live boss tracking.',
    guildIds: COMMAND_GUILDS.TRACK_BOSS_PAUSE,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  TRACK_BOSS_RESUME: {
    name: 'trackbossresume',
    description: 'Resumes paused live boss tracking.',
    guildIds: COMMAND_GUILDS.TRACK_BOSS_RESUME,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  TRACK_BOSS_END: {
    name: 'trackbossend',
    description: 'Ends live boss tracking.',
    guildIds: COMMAND_GUILDS.TRACK_BOSS_END,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  TRACK_BOSS_STATUS: {
    name: 'trackbossstatus',
    description: 'Shows the active boss tracking session.',
    guildIds: COMMAND_GUILDS.TRACK_BOSS_STATUS,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  TRACK_BOSS_CANCEL: {
    name: 'trackbosscancel',
    description: 'Cancels the active boss tracking session.',
    guildIds: COMMAND_GUILDS.TRACK_BOSS_CANCEL,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  UPDATE_BOSS_INFO: {
    name: 'updatebossinfo',
    description: 'Updates a tracked boss name, aliases, and topic tags.',
    guildIds: COMMAND_GUILDS.UPDATE_BOSS_INFO,
    helpAudience: HELP_AUDIENCES.PUBLIC,
    helpCategory: COMMAND_CATEGORIES.BOSSES,
  },
  DAVI_STREAM_INFO: {
    name: 'davistreaminfo',
    description: 'Shows prod env stream information from staging.',
    guildIds: COMMAND_GUILDS.DAVI_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
  DAVI_SET_GAME: {
    name: 'davisetgame',
    description: 'Sets the prod env default game from staging.',
    guildIds: COMMAND_GUILDS.DAVI_SET_GAME,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
  DAVI_SET_STREAM_INFO: {
    name: 'davisetstreaminfo',
    description: 'Updates the prod env current/next stream from staging.',
    guildIds: COMMAND_GUILDS.DAVI_SET_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
  DAVI_RESET_TITLE: {
    name: 'daviresettitle',
    description: 'Resets title override for prod env current/next stream.',
    guildIds: COMMAND_GUILDS.DAVI_RESET_TITLE,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
  DAVI_RESET_STREAM_INFO: {
    name: 'daviresetstreaminfo',
    description: 'Resets all overrides for prod env current/next stream.',
    guildIds: COMMAND_GUILDS.DAVI_RESET_STREAM_INFO,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
  DAVI_SKIP_STREAM: {
    name: 'daviskipstream',
    description: 'Skips the prod env current/next stream from staging.',
    guildIds: COMMAND_GUILDS.DAVI_SKIP_STREAM,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
  DAVI_BOSS_TRIAL_STATS: {
    name: 'davibosstrialstats',
    description: 'Shows prod env boss trial stats from staging.',
    guildIds: COMMAND_GUILDS.DAVI_BOSS_TRIAL_STATS,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
  DAVI_COMMUNITY_TOPIC_STATS: {
    name: 'davibossdiscussionstats',
    description: 'Shows prod env boss/game discussion signals from staging.',
    guildIds: COMMAND_GUILDS.DAVI_COMMUNITY_TOPIC_STATS,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
  DAVI_SYNC_BOSS_STATS: {
    name: 'davisyncbossstats',
    description: 'Syncs prod env boss stats from staging.',
    guildIds: COMMAND_GUILDS.DAVI_SYNC_BOSS_STATS,
    helpAudience: HELP_AUDIENCES.ADMIN,
    helpCategory: COMMAND_CATEGORIES.STAGING,
  },
} as const satisfies Record<string, CommandMetadata>;

export const HELP_COMMANDS = Object.values(COMMAND_METADATA);

export { COMMAND_CATEGORIES } from './discord-command-categories';
