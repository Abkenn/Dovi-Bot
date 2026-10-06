export type RegisterActivityInstanceInput = {
  instanceId: string;
  guildId: string;
  channelId: string;
  launchedByUserId: string;
  target: string | null;
};

export type ActivityParticipant = {
  userId: string;
  firstSeenAt: number;
  lastSeenAt: number;
  connected: boolean;
};

export type TrackedActivityInstance = RegisterActivityInstanceInput & {
  registeredAt: number;
  lastCheckedAt: number | null;
  expiresAt: number;
  status: 'pending' | 'active' | 'unavailable';
  participants: ActivityParticipant[];
  joinedUserIds: string[];
  leftUserIds: string[];
};

export type ActivityInstanceSnapshot = {
  instanceId: string;
  location: { guildId: string | null; channelId: string };
  users: readonly string[];
};

export type FetchActivityInstance = (
  instanceId: string,
) => Promise<ActivityInstanceSnapshot>;
