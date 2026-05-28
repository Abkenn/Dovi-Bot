import type { SapphireClient } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';

type UptimeRobotStatusResponse = {
  status?: string;
  monitor?: {
    name?: string;
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
  status?: string;
  database?: string;
  discord?: {
    status?: string;
    lastError?: string | null;
  };
};

type UptimeStatusState = 'operational' | 'not_operational';
type HealthCheckState = 'ok' | 'not_ok';

const STATUS_CHECK_TIMEOUT_MS = 15_000;
const HEALTH_CHECK_TIMEOUT_MS = 15_000;

let uptimeStatusInterval: NodeJS.Timeout | undefined;
let healthCheckInterval: NodeJS.Timeout | undefined;
let activeUptimeStatusCheck: Promise<void> | undefined;
let activeHealthCheck: Promise<void> | undefined;
let lastUptimeState: UptimeStatusState | undefined;
let lastHealthCheckState: HealthCheckState | undefined;

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

const fetchUptimeStatus = async (signal: AbortSignal) => {
  if (!env.UPTIME_STATUS_MONITOR_URL) {
    return null;
  }

  const response = await fetch(
    getUptimeRobotApiUrl(env.UPTIME_STATUS_MONITOR_URL),
    {
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `UptimeRobot status check failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as UptimeRobotStatusResponse;
};

const isOperational = (status: UptimeRobotStatusResponse) => {
  const downCount = status.statistics?.counts?.down ?? 0;
  const pausedCount = status.statistics?.counts?.paused ?? 0;

  return (
    status.status === 'ok' &&
    status.monitor?.statusClass === 'success' &&
    downCount === 0 &&
    pausedCount === 0
  );
};

const formatStatusDetail = (status: UptimeRobotStatusResponse) => {
  const monitorName = status.monitor?.name ?? 'Unknown monitor';
  const statusClass = status.monitor?.statusClass ?? 'unknown';
  const downCount = status.statistics?.counts?.down ?? 0;
  const pausedCount = status.statistics?.counts?.paused ?? 0;

  return [
    `Monitor: ${monitorName}`,
    `Status: ${statusClass}`,
    `Down: ${downCount}`,
    `Paused: ${pausedCount}`,
  ].join('\n');
};

const sendUptimeStatusDm = async (client: SapphireClient, content: string) => {
  if (!env.DEPLOYMENT_NOTIFY_USER_ID) {
    return;
  }

  const user = await client.users.fetch(env.DEPLOYMENT_NOTIFY_USER_ID);

  await user.send(content);
};

const fetchHealthCheck = async (signal: AbortSignal) => {
  if (!env.HEALTH_CHECK_MONITOR_URL) {
    return null;
  }

  const response = await fetch(env.HEALTH_CHECK_MONITOR_URL, { signal });

  if (!response.ok) {
    throw new Error(
      `Health check failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as HealthCheckResponse;
};

const isHealthCheckOk = (healthCheck: HealthCheckResponse) =>
  healthCheck.status === 'ok' &&
  healthCheck.database === 'ok' &&
  healthCheck.discord?.status === 'ready';

const formatHealthCheckDetail = (healthCheck: HealthCheckResponse) =>
  [
    `Status: ${healthCheck.status ?? 'unknown'}`,
    `Database: ${healthCheck.database ?? 'unknown'}`,
    `Discord: ${healthCheck.discord?.status ?? 'unknown'}`,
    healthCheck.discord?.lastError
      ? `Discord error: ${healthCheck.discord.lastError}`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

const runUptimeStatusCheck = async (client: SapphireClient) => {
  if (!env.UPTIME_STATUS_MONITOR_URL) {
    return;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, STATUS_CHECK_TIMEOUT_MS);

  try {
    const status = await fetchUptimeStatus(abortController.signal);

    if (!status) {
      return;
    }

    const currentState: UptimeStatusState = isOperational(status)
      ? 'operational'
      : 'not_operational';

    if (currentState === lastUptimeState) {
      return;
    }

    lastUptimeState = currentState;

    if (currentState === 'not_operational') {
      await sendUptimeStatusDm(
        client,
        [
          'Dovi Bot uptime status is not operational.',
          formatStatusDetail(status),
          `Page: ${env.UPTIME_STATUS_MONITOR_URL}`,
        ].join('\n'),
      );
      return;
    }

    await sendUptimeStatusDm(
      client,
      [
        'Dovi Bot uptime status recovered.',
        'Status: Operational',
        `Page: ${env.UPTIME_STATUS_MONITOR_URL}`,
      ].join('\n'),
    );
  } catch (error) {
    if (lastUptimeState === 'not_operational') {
      return;
    }

    lastUptimeState = 'not_operational';
    await sendUptimeStatusDm(
      client,
      [
        'Dovi Bot uptime status could not be checked.',
        `- Error: ${error instanceof Error ? error.message : String(error)}`,
        `Page: ${env.UPTIME_STATUS_MONITOR_URL}`,
      ].join('\n'),
    );
  } finally {
    clearTimeout(timeout);
  }
};

const runHealthCheck = async (client: SapphireClient) => {
  if (!env.HEALTH_CHECK_MONITOR_URL) {
    return;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, HEALTH_CHECK_TIMEOUT_MS);

  try {
    const healthCheck = await fetchHealthCheck(abortController.signal);

    if (!healthCheck) {
      return;
    }

    const currentState: HealthCheckState = isHealthCheckOk(healthCheck)
      ? 'ok'
      : 'not_ok';

    if (currentState === 'ok') {
      lastHealthCheckState = currentState;
      return;
    }

    if (currentState === lastHealthCheckState) {
      return;
    }

    lastHealthCheckState = currentState;
    await sendUptimeStatusDm(
      client,
      [
        'Dovi Bot health check is not okay.',
        formatHealthCheckDetail(healthCheck),
        `Page: ${env.HEALTH_CHECK_MONITOR_URL}`,
      ].join('\n'),
    );
  } catch (error) {
    if (lastHealthCheckState === 'not_ok') {
      return;
    }

    lastHealthCheckState = 'not_ok';
    await sendUptimeStatusDm(
      client,
      [
        'Dovi Bot health check could not be checked.',
        `- Error: ${error instanceof Error ? error.message : String(error)}`,
        `Page: ${env.HEALTH_CHECK_MONITOR_URL}`,
      ].join('\n'),
    );
  } finally {
    clearTimeout(timeout);
  }
};

const runScheduledUptimeStatusCheck = async (client: SapphireClient) => {
  if (activeUptimeStatusCheck) {
    return activeUptimeStatusCheck;
  }

  activeUptimeStatusCheck = runUptimeStatusCheck(client).finally(() => {
    activeUptimeStatusCheck = undefined;
  });

  return activeUptimeStatusCheck;
};

const runScheduledHealthCheck = async (client: SapphireClient) => {
  if (activeHealthCheck) {
    return activeHealthCheck;
  }

  activeHealthCheck = runHealthCheck(client).finally(() => {
    activeHealthCheck = undefined;
  });

  return activeHealthCheck;
};

export const startUptimeStatusMonitor = (client: SapphireClient) => {
  if (!env.UPTIME_STATUS_MONITOR_URL) {
    return;
  }

  void runScheduledUptimeStatusCheck(client).catch((error) => {
    console.error('Uptime status monitor failed.', error);
  });

  if (uptimeStatusInterval) {
    return;
  }

  uptimeStatusInterval = setInterval(() => {
    void runScheduledUptimeStatusCheck(client).catch((error) => {
      console.error('Uptime status monitor failed.', error);
    });
  }, env.UPTIME_STATUS_MONITOR_INTERVAL_MS);

  uptimeStatusInterval.unref();
};

export const startHealthCheckMonitor = (client: SapphireClient) => {
  if (!env.HEALTH_CHECK_MONITOR_URL) {
    return;
  }

  void runScheduledHealthCheck(client).catch((error) => {
    console.error('Health check monitor failed.', error);
  });

  if (healthCheckInterval) {
    return;
  }

  healthCheckInterval = setInterval(() => {
    void runScheduledHealthCheck(client).catch((error) => {
      console.error('Health check monitor failed.', error);
    });
  }, env.HEALTH_CHECK_MONITOR_INTERVAL_MS);

  healthCheckInterval.unref();
};
