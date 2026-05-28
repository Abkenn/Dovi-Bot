import { env } from '@zod-schemas/env.zod';

type UptimeRobotStatusResponse = {
  status?: string;
  monitor?: {
    statusClass?: string;
  };
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

export type BotStatus = {
  isOperational: boolean;
  database?: 'healthy' | 'sleepy' | 'unknown';
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

export const fetchBotStatus = async ({
  includeDatabase,
  signal,
}: {
  includeDatabase: boolean;
  signal?: AbortSignal;
}): Promise<BotStatus> => {
  if (!env.UPTIME_STATUS_MONITOR_URL) {
    throw new Error('UPTIME_STATUS_MONITOR_URL is not configured.');
  }

  const response = await fetch(
    getUptimeRobotApiUrl(env.UPTIME_STATUS_MONITOR_URL),
    signal ? { signal } : undefined,
  );

  if (!response.ok) {
    throw new Error(
      `UptimeRobot status check failed: ${response.status} ${response.statusText}`,
    );
  }

  const status = (await response.json()) as UptimeRobotStatusResponse;
  const downCount = status.statistics?.counts?.down ?? 0;
  const pausedCount = status.statistics?.counts?.paused ?? 0;
  const botStatus: BotStatus = {
    isOperational:
      status.status === 'ok' &&
      status.monitor?.statusClass === 'success' &&
      downCount === 0 &&
      pausedCount === 0,
  };

  if (includeDatabase) {
    botStatus.database = await fetchDatabaseStatus(signal);
  }

  return botStatus;
};
