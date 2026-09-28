import { z } from 'zod';

export const uptimeRobotStatusSchema = z.object({
  status: z.string().optional(),
  monitor: z
    .object({
      name: z.string().optional(),
      statusClass: z.string().optional(),
    })
    .optional(),
  statistics: z
    .object({
      counts: z
        .object({
          down: z.number().optional(),
          paused: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const healthCheckResponseSchema = z.object({
  status: z.string().optional(),
  database: z.string().optional(),
  discord: z
    .object({
      status: z.string().optional(),
      lastError: z.string().nullable().optional(),
    })
    .optional(),
});
