type DiscordHealthStatus = 'starting' | 'ready' | 'login_failed';

type RuntimeHealth = {
  discord: {
    status: DiscordHealthStatus;
    lastError: string | null;
    updatedAt: Date;
  };
};

const runtimeHealth: RuntimeHealth = {
  discord: {
    status: 'starting',
    lastError: null,
    updatedAt: new Date(),
  },
};

export const markDiscordStarting = () => {
  runtimeHealth.discord = {
    status: 'starting',
    lastError: null,
    updatedAt: new Date(),
  };
};

export const markDiscordReady = () => {
  runtimeHealth.discord = {
    status: 'ready',
    lastError: null,
    updatedAt: new Date(),
  };
};

export const markDiscordLoginFailed = (error: unknown) => {
  runtimeHealth.discord = {
    status: 'login_failed',
    lastError: error instanceof Error ? error.message : String(error),
    updatedAt: new Date(),
  };
};

export const getRuntimeHealth = () => runtimeHealth;
