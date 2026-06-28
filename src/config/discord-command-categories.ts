import { DISCORD_STYLE } from './discord-style';

export const COMMAND_CATEGORIES = {
  HELP: 'Help',
  GENERAL: 'General',
  MISC: 'Misc',
  POLL_TOURNAMENTS: 'Poll Tournaments',
  STREAM_INFO: 'Stream Info',
  BOSSES: 'Bosses',
  STREAM_GAME_TRACKING_TOOLS: 'Stream Game Tracking Tools',
  BOSS_TRIALS: 'Boss Trials',
  COMMUNITY_STATS: 'Community Stats',
  STAGING: 'Staging',
} as const;

export type CommandHelpCategory =
  (typeof COMMAND_CATEGORIES)[keyof typeof COMMAND_CATEGORIES];

export type CommandCategoryMetadata = {
  name: CommandHelpCategory;
  accentColor?: number;
};

export const COMMAND_CATEGORY_METADATA = {
  [COMMAND_CATEGORIES.GENERAL]: {
    name: COMMAND_CATEGORIES.GENERAL,
    accentColor: 0x57f287,
  },
  [COMMAND_CATEGORIES.MISC]: {
    name: COMMAND_CATEGORIES.MISC,
    accentColor: 0x57f287,
  },
  [COMMAND_CATEGORIES.POLL_TOURNAMENTS]: {
    name: COMMAND_CATEGORIES.POLL_TOURNAMENTS,
    accentColor: 0xe843c4,
  },
  [COMMAND_CATEGORIES.STREAM_INFO]: {
    name: COMMAND_CATEGORIES.STREAM_INFO,
    accentColor: DISCORD_STYLE.BOT_ACCENT_COLOR,
  },
  [COMMAND_CATEGORIES.BOSSES]: {
    name: COMMAND_CATEGORIES.BOSSES,
    accentColor: 0xf59e0b,
  },
  [COMMAND_CATEGORIES.STREAM_GAME_TRACKING_TOOLS]: {
    name: COMMAND_CATEGORIES.STREAM_GAME_TRACKING_TOOLS,
    accentColor: 0xf59e0b,
  },
  [COMMAND_CATEGORIES.BOSS_TRIALS]: {
    name: COMMAND_CATEGORIES.BOSS_TRIALS,
    accentColor: 0xc026d3,
  },
  [COMMAND_CATEGORIES.COMMUNITY_STATS]: {
    name: COMMAND_CATEGORIES.COMMUNITY_STATS,
    accentColor: 0x14b8a6,
  },
  [COMMAND_CATEGORIES.STAGING]: {
    name: COMMAND_CATEGORIES.STAGING,
    accentColor: 0x5865f2,
  },
  [COMMAND_CATEGORIES.HELP]: {
    name: COMMAND_CATEGORIES.HELP,
    accentColor: 0xfee75c,
  },
} as const satisfies Record<CommandHelpCategory, CommandCategoryMetadata>;

export const getCommandCategoryAccentColor = (
  category: CommandHelpCategory,
): number =>
  COMMAND_CATEGORY_METADATA[category].accentColor ??
  DISCORD_STYLE.BOT_ACCENT_COLOR;
