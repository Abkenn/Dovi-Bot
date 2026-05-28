import { env } from '@zod-schemas/env.zod';

type UptimeRobotRatio = {
  date?: string;
  ratio?: string;
  color?: string;
};

type UptimeRobotStatusResponse = {
  status?: string;
  monitor?: {
    statusClass?: string;
    checkInterval?: string;
  };
  responseTimeStats?: {
    avg_response_time?: number;
    max_response_time?: number;
    min_response_time?: number;
  };
  '1dRatio'?: {
    ratio?: string;
  };
  '7dRatio'?: {
    ratio?: string;
  };
  '30dRatio'?: {
    ratio?: string;
  };
  '90dRatio'?: {
    ratio?: string;
  };
  dailyRatios?: UptimeRobotRatio[];
  statistics?: {
    counts?: {
      down?: number;
      paused?: number;
    };
  };
};

type HealthCheckResponse = {
  database?: string;
};

export type BotStatusDay = {
  date: string;
  ratio: number;
  status: 'up' | 'degraded' | 'down';
};

export type BotStatus = {
  isOperational: boolean;
  checkInterval: string;
  uptime: {
    last24Hours: string;
    last7Days: string;
    last30Days: string;
    last90Days: string;
  };
  responseTime: {
    averageMs: number | null;
    maximumMs: number | null;
    minimumMs: number | null;
  };
  database: 'healthy' | 'sleepy' | 'unknown';
  days: BotStatusDay[];
  checkedAt: Date;
};

const getUptimeRobotApiUrl = (statusPageUrl: string) => {
  const url = new URL(statusPageUrl);

  if (url.pathname.startsWith('/api/getMonitor/')) {
    return url;
  }

  const [statusPageKey, monitorId] = url.pathname.split('/').filter(Boolean);

  if (!statusPageKey || !monitorId) {
    throw new Error(
      'UPTIME_STATUS_MONITOR_URL must be an UptimeRobot monitor status page URL.',
    );
  }

  return new URL(`/api/getMonitor/${statusPageKey}?m=${monitorId}`, url.origin);
};

const formatRatio = (ratio: string | undefined) => {
  const parsedRatio = Number(ratio);

  if (!Number.isFinite(parsedRatio)) {
    return 'Unknown';
  }

  return `${parsedRatio.toFixed(3)}%`;
};

const getDayStatus = (ratio: number): BotStatusDay['status'] => {
  if (ratio >= 99.9) {
    return 'up';
  }

  if (ratio > 0) {
    return 'degraded';
  }

  return 'down';
};

const mapDays = (dailyRatios: UptimeRobotRatio[] | undefined) =>
  (dailyRatios ?? [])
    .filter((day) => day.color !== 'grey')
    .map((day) => {
      const ratio = Number(day.ratio);

      if (!day.date || !Number.isFinite(ratio)) {
        return null;
      }

      return {
        date: day.date,
        ratio,
        status: getDayStatus(ratio),
      };
    })
    .filter((day): day is BotStatusDay => day !== null);

const fetchDatabaseStatus = async (signal?: AbortSignal) => {
  if (!env.HEALTH_CHECK_MONITOR_URL) {
    return 'unknown' as const;
  }

  const response = await fetch(
    env.HEALTH_CHECK_MONITOR_URL,
    signal ? { signal } : undefined,
  ).catch(() => null);

  if (!response?.ok) {
    return 'unknown' as const;
  }

  const healthCheck = (await response.json()) as HealthCheckResponse;

  return healthCheck.database === 'ok' ? 'healthy' : 'sleepy';
};

export const fetchBotStatus = async (
  signal?: AbortSignal,
): Promise<BotStatus> => {
  if (!env.UPTIME_STATUS_MONITOR_URL) {
    throw new Error('UPTIME_STATUS_MONITOR_URL is not configured.');
  }

  const [response, database] = await Promise.all([
    fetch(
      getUptimeRobotApiUrl(env.UPTIME_STATUS_MONITOR_URL),
      signal ? { signal } : undefined,
    ),
    fetchDatabaseStatus(signal),
  ]);

  if (!response.ok) {
    throw new Error(
      `UptimeRobot status check failed: ${response.status} ${response.statusText}`,
    );
  }

  const status = (await response.json()) as UptimeRobotStatusResponse;
  const downCount = status.statistics?.counts?.down ?? 0;
  const pausedCount = status.statistics?.counts?.paused ?? 0;

  return {
    isOperational:
      status.status === 'ok' &&
      status.monitor?.statusClass === 'success' &&
      downCount === 0 &&
      pausedCount === 0,
    checkInterval: status.monitor?.checkInterval ?? 'Checked regularly',
    uptime: {
      last24Hours: formatRatio(status['1dRatio']?.ratio),
      last7Days: formatRatio(status['7dRatio']?.ratio),
      last30Days: formatRatio(status['30dRatio']?.ratio),
      last90Days: formatRatio(status['90dRatio']?.ratio),
    },
    responseTime: {
      averageMs: status.responseTimeStats?.avg_response_time ?? null,
      maximumMs: status.responseTimeStats?.max_response_time ?? null,
      minimumMs: status.responseTimeStats?.min_response_time ?? null,
    },
    database,
    days: mapDays(status.dailyRatios),
    checkedAt: new Date(),
  };
};
