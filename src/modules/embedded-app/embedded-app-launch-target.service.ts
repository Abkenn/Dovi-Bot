const LAUNCH_TARGET_TTL_MS = 10 * 60 * 1_000;
const MAX_LAUNCH_TARGETS = 100;

const launchTargets = new Map<
  string,
  { gameName: string; expiresAt: number }
>();

const pruneLaunchTargets = () => {
  const now = Date.now();

  for (const [instanceId, target] of launchTargets) {
    if (target.expiresAt <= now) {
      launchTargets.delete(instanceId);
    }
  }
};

export const registerEmbeddedAppLaunchTarget = (
  instanceId: string,
  gameName: string,
) => {
  pruneLaunchTargets();

  if (launchTargets.size >= MAX_LAUNCH_TARGETS) {
    const oldestInstanceId = launchTargets.keys().next().value;

    if (oldestInstanceId) {
      launchTargets.delete(oldestInstanceId);
    }
  }

  launchTargets.set(instanceId, {
    gameName,
    expiresAt: Date.now() + LAUNCH_TARGET_TTL_MS,
  });
};

export const getEmbeddedAppLaunchTarget = (instanceId: string) => {
  pruneLaunchTargets();
  return launchTargets.get(instanceId)?.gameName ?? null;
};
