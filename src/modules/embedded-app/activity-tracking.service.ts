import type {
  FetchActivityInstance,
  RegisterActivityInstanceInput,
  TrackedActivityInstance,
} from './activity-tracking.types';

const IDLE_TTL_MS = 60 * 60_000;
const MAX_INSTANCES = 100;
const MAX_PARTICIPANTS = 100;
const instances = new Map<string, TrackedActivityInstance>();
let activeRefresh: Promise<void> | undefined;

const pruneInstances = () => {
  for (const [id, instance] of instances) {
    if (instance.expiresAt <= Date.now()) instances.delete(id);
  }
};

export const registerActivityInstance = (
  input: RegisterActivityInstanceInput,
) => {
  pruneInstances();
  const existing = instances.get(input.instanceId);
  if (existing) {
    if (
      existing.guildId !== input.guildId ||
      existing.channelId !== input.channelId
    )
      return;
    existing.target = input.target;
    existing.expiresAt = Date.now() + IDLE_TTL_MS;
    return;
  }
  if (instances.size >= MAX_INSTANCES) {
    const oldestId = instances.keys().next().value;
    if (oldestId) instances.delete(oldestId);
  }
  instances.set(input.instanceId, {
    ...input,
    registeredAt: Date.now(),
    lastCheckedAt: null,
    expiresAt: Date.now() + IDLE_TTL_MS,
    status: 'pending',
    participants: [],
    joinedUserIds: [],
    leftUserIds: [],
  });
};

const refreshInstance = async (
  instance: TrackedActivityInstance,
  fetchInstance: FetchActivityInstance,
) => {
  try {
    const snapshot = await fetchInstance(instance.instanceId);
    if (instances.get(instance.instanceId) !== instance) return;
    if (
      snapshot.instanceId !== instance.instanceId ||
      snapshot.location.guildId !== instance.guildId ||
      snapshot.location.channelId !== instance.channelId
    ) {
      instance.status = 'unavailable';
      return;
    }
    const now = Date.now();
    const users = new Set(snapshot.users.slice(0, MAX_PARTICIPANTS));
    const previous = new Set(
      instance.participants
        .filter((user) => user.connected)
        .map((user) => user.userId),
    );
    instance.joinedUserIds = [...users].filter((id) => !previous.has(id));
    instance.leftUserIds = [...previous].filter((id) => !users.has(id));
    for (const participant of instance.participants) {
      participant.connected = users.has(participant.userId);
      if (participant.connected) participant.lastSeenAt = now;
    }
    const known = new Set(instance.participants.map((user) => user.userId));
    for (const userId of users) {
      if (!known.has(userId))
        instance.participants.push({
          userId,
          firstSeenAt: now,
          lastSeenAt: now,
          connected: true,
        });
    }
    instance.participants = [
      ...instance.participants.filter((user) => user.connected),
      ...instance.participants.filter((user) => !user.connected),
    ].slice(0, MAX_PARTICIPANTS);
    instance.status = 'active';
    instance.lastCheckedAt = now;
    if (users.size) instance.expiresAt = now + IDLE_TTL_MS;
  } catch {
    if (instances.get(instance.instanceId) === instance)
      instance.status = 'unavailable';
  }
};

export const refreshActivityInstances = (
  fetchInstance: FetchActivityInstance,
): Promise<void> => {
  if (activeRefresh) return activeRefresh;
  pruneInstances();
  const entries = [...instances.values()];
  activeRefresh = (async () => {
    for (let index = 0; index < entries.length; index += 5) {
      await Promise.all(
        entries
          .slice(index, index + 5)
          .map((entry) => refreshInstance(entry, fetchInstance)),
      );
    }
  })().finally(() => {
    activeRefresh = undefined;
  });
  return activeRefresh;
};

export const getTrackedActivityInstances = (
  guildId: string,
): TrackedActivityInstance[] => {
  pruneInstances();
  return [...instances.values()]
    .filter((entry) => entry.guildId === guildId)
    .map((entry) => ({
      ...entry,
      participants: entry.participants.map((user) => ({ ...user })),
      joinedUserIds: [...entry.joinedUserIds],
      leftUserIds: [...entry.leftUserIds],
    }));
};
