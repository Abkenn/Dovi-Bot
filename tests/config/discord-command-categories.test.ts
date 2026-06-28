import { afterEach, describe, expect, it } from 'vitest';
import {
  COMMAND_CATEGORIES,
  COMMAND_CATEGORY_METADATA,
  getCommandCategoryAccentColor,
} from '../../src/config/discord-command-categories';
import { DISCORD_STYLE } from '../../src/config/discord-style';

const originalHelpAccentColor =
  COMMAND_CATEGORY_METADATA[COMMAND_CATEGORIES.HELP].accentColor;

describe('discord command categories', () => {
  afterEach(() => {
    Object.defineProperty(
      COMMAND_CATEGORY_METADATA[COMMAND_CATEGORIES.HELP],
      'accentColor',
      {
        value: originalHelpAccentColor,
      },
    );
  });

  it('returns configured category accent colors', () => {
    expect(getCommandCategoryAccentColor(COMMAND_CATEGORIES.HELP)).toBe(
      originalHelpAccentColor,
    );
  });

  it('provides a misc category for utility commands', () => {
    expect(COMMAND_CATEGORIES.MISC).toBe('Misc');
    expect(COMMAND_CATEGORY_METADATA[COMMAND_CATEGORIES.MISC].name).toBe(
      'Misc',
    );
  });

  it('uses a distinct hot pink-purple for poll tournaments', () => {
    expect(
      getCommandCategoryAccentColor(COMMAND_CATEGORIES.POLL_TOURNAMENTS),
    ).toBe(0xe843c4);
    expect(
      getCommandCategoryAccentColor(COMMAND_CATEGORIES.POLL_TOURNAMENTS),
    ).not.toBe(getCommandCategoryAccentColor(COMMAND_CATEGORIES.BOSS_TRIALS));
  });

  it('falls back to the bot accent color when a category has no accent color', () => {
    Object.defineProperty(
      COMMAND_CATEGORY_METADATA[COMMAND_CATEGORIES.HELP],
      'accentColor',
      {
        value: undefined,
      },
    );

    expect(getCommandCategoryAccentColor(COMMAND_CATEGORIES.HELP)).toBe(
      DISCORD_STYLE.BOT_ACCENT_COLOR,
    );
  });
});
