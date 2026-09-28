import ky, { type Options } from 'ky';

// Callers own status handling, cancellation deadlines, and any deliberate retries.
const apiDefaults = {
  retry: 0,
  timeout: false,
  throwHttpErrors: false,
} satisfies Options;

export const githubApi = ky.create({
  ...apiDefaults,
  baseUrl: 'https://api.github.com/',
});
export const discordApi = ky.create({
  ...apiDefaults,
  baseUrl: 'https://discord.com/api/v10/',
});
export const steamApi = ky.create({
  ...apiDefaults,
  baseUrl: 'https://store.steampowered.com/',
});
export const youtubeApi = ky.create({
  ...apiDefaults,
  baseUrl: 'https://www.googleapis.com/youtube/v3/',
});
export const frankfurterApi = ky.create({
  ...apiDefaults,
  baseUrl: 'https://api.frankfurter.dev/v2/',
});
export const googleSheetsApi = ky.create({
  ...apiDefaults,
  baseUrl: 'https://docs.google.com/spreadsheets/d/',
});
export const openCriticApi = ky.create({
  ...apiDefaults,
  baseUrl: 'https://opencritic-api.p.rapidapi.com/',
  headers: { 'x-rapidapi-host': 'opencritic-api.p.rapidapi.com' },
});
export const hltbApi = ky.create({
  ...apiDefaults,
  baseUrl: 'https://howlongtobeat.com/',
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://howlongtobeat.com/',
    Origin: 'https://howlongtobeat.com',
  },
});

export const createDoviApi = (baseUrl: string) =>
  ky.create({ ...apiDefaults, baseUrl });

export const createUptimeRobotApi = (statusPageUrl: string) => {
  const url = new URL(statusPageUrl);
  if (url.pathname.startsWith('/api/getMonitor/')) {
    return ky.create({ ...apiDefaults, baseUrl: url.href });
  }

  const [statusPageKey, monitorId] = url.pathname.split('/').filter(Boolean);
  if (!statusPageKey || !monitorId) {
    throw new Error(
      'UPTIME_STATUS_MONITOR_URL must be an UptimeRobot monitor status page URL.',
    );
  }

  const baseUrl = new URL(
    `/api/getMonitor/${statusPageKey}?m=${monitorId}`,
    url.origin,
  ).href;
  return ky.create({ ...apiDefaults, baseUrl });
};
