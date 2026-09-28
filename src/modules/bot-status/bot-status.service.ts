import { env } from '@zod-schemas/env.zod';
import type { z } from 'zod';
import { createDoviApi, createUptimeRobotApi } from '../../lib/api';
import {
  healthCheckResponseSchema,
  uptimeRobotStatusSchema,
} from '../../types/zod-schemas/status-response.zod';

export type BotStatus = {
  isOperational: boolean;
  database?: 'healthy' | 'sleepy' | 'unknown';
};

const fetchDatabaseStatus = async (signal?: AbortSignal) => {
  if (!env.HEALTH_CHECK_MONITOR_URL) {
    return 'unknown' as const;
  }

  const doviApi = createDoviApi(env.HEALTH_CHECK_MONITOR_URL);
  const response = await doviApi
    .get<z.infer<typeof healthCheckResponseSchema>>('', {
      signal: signal ?? null,
    })
    .catch(() => null);

  if (!response?.ok) {
    return 'unknown' as const;
  }

  const healthCheck = healthCheckResponseSchema.parse(await response.json());

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

  const uptimeRobotApi = createUptimeRobotApi(env.UPTIME_STATUS_MONITOR_URL);
  const response = await uptimeRobotApi.get<
    z.infer<typeof uptimeRobotStatusSchema>
  >('', { signal: signal ?? null });

  if (!response.ok) {
    throw new Error(
      `UptimeRobot status check failed: ${response.status} ${response.statusText}`,
    );
  }

  const status = uptimeRobotStatusSchema.parse(await response.json());
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
