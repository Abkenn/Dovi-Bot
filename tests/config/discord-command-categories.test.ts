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
