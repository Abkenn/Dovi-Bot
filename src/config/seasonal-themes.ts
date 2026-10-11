import type { SeasonalTheme } from '../modules/command-runner/seasonal-command-theme.types';

export const SEASONAL_THEMES: Record<string, SeasonalTheme | null> = {
  halloween: {
    id: 'halloween',
    accentColor: 0x8b0000,
    emoji: '<a:eye:1558676165785419866>',
    embed: { every: 2, first: true, repeats: 'normal-and-reset' },
    text: { every: 5, first: false, repeats: 'skip' },
  },
  christmas: null,
  easter: null,
};

export const SEASONAL_CALENDAR: Readonly<Record<number, string>> = {
  10: 'halloween',
};

export const SEASONAL_DATE_OVERRIDES: Readonly<Record<string, string>> = {};

export const getSeasonalTheme = (
  mode = 'auto',
  now = new Date(),
): SeasonalTheme | null => {
  if (mode === 'normal') return null;
  if (mode !== 'auto')
    return Object.hasOwn(SEASONAL_THEMES, mode)
      ? (SEASONAL_THEMES[mode] ?? null)
      : null;
  const date = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(now);
  const month = Number(
    new Intl.DateTimeFormat('en', {
      month: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(now),
  );
  const theme = SEASONAL_DATE_OVERRIDES[date] ?? SEASONAL_CALENDAR[month];
  return theme ? (SEASONAL_THEMES[theme] ?? null) : null;
};
