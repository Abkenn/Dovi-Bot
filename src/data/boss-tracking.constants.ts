import { BossTrackingSessionStatus } from '../generated/prisma/enums';

export const OPEN_BOSS_TRACKING_SESSION_STATUSES = [
  BossTrackingSessionStatus.ACTIVE,
  BossTrackingSessionStatus.PAUSED,
] satisfies BossTrackingSessionStatus[];
