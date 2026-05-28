import { DISCORD_STYLE } from './discord-style';

export const HELP_CATEGORIES = {
  HELP: 'Help',
  GENERAL: 'General',
  STREAM_INFO: 'Stream Info',
  BOSSES: 'Bosses',
  BOSS_TRIALS: 'Boss Trials',
  STAGING: 'Staging',
} as const;

export type CommandHelpCategory =
  (typeof HELP_CATEGORIES)[keyof typeof HELP_CATEGORIES];

export type CommandCategoryMetadata = {
  name: CommandHelpCategory;
  accentColor?: number;
};

export const COMMAND_CATEGORY_METADATA = {
  [HELP_CATEGORIES.GENERAL]: {
    name: HELP_CATEGORIES.GENERAL,
    accentColor: 0x57f287,
  },
  [HELP_CATEGORIES.STREAM_INFO]: {
    name: HELP_CATEGORIES.STREAM_INFO,
    accentColor: DISCORD_STYLE.BOT_ACCENT_COLOR,
  },
  [HELP_CATEGORIES.BOSSES]: {
    name: HELP_CATEGORIES.BOSSES,
    accentColor: 0xf59e0b,
  },
  [HELP_CATEGORIES.BOSS_TRIALS]: {
    name: HELP_CATEGORIES.BOSS_TRIALS,
    accentColor: 0xc026d3,
  },
  [HELP_CATEGORIES.STAGING]: {
    name: HELP_CATEGORIES.STAGING,
    accentColor: 0x5865f2,
  },
  [HELP_CATEGORIES.HELP]: {
    name: HELP_CATEGORIES.HELP,
    accentColor: 0xfee75c,
  },
} as const satisfies Record<CommandHelpCategory, CommandCategoryMetadata>;

export const getCommandCategoryAccentColor = (
  category: CommandHelpCategory,
): number =>
  COMMAND_CATEGORY_METADATA[category].accentColor ??
  DISCORD_STYLE.BOT_ACCENT_COLOR;
