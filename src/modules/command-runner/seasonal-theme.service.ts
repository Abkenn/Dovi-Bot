import {
  findSeasonalThemeMode,
  saveSeasonalThemeMode,
} from '@data/queries/seasonal-theme';
import { BOT_GUILDS } from '../../config/discord-access';
import {
  getSeasonalTheme,
  SEASONAL_THEMES,
} from '../../config/seasonal-themes';

let cachedMode: Promise<string> | undefined;

export const getBotThemeMode = () => {
  cachedMode ??= findSeasonalThemeMode(BOT_GUILDS.STAGING_ENV).catch(
    (error: unknown) => {
      cachedMode = undefined;
      throw error;
    },
  );
  return cachedMode;
};

export const getBotSeasonalTheme = async () => {
  try {
    return getSeasonalTheme(await getBotThemeMode());
  } catch (error) {
    console.error('Failed to load bot seasonal theme', error);
    return null;
  }
};

export const setBotThemeMode = async (mode: string) => {
  if (mode !== 'auto' && mode !== 'normal') {
    if (!Object.hasOwn(SEASONAL_THEMES, mode))
      throw new Error('Unknown seasonal theme.');
    if (!SEASONAL_THEMES[mode])
      throw new Error('That seasonal theme is not configured yet.');
  }
  await saveSeasonalThemeMode(BOT_GUILDS.STAGING_ENV, mode);
  cachedMode = Promise.resolve(mode);
};
