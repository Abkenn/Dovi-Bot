import {
  ComponentType,
  type Interaction,
  type Message,
  MessageFlags,
} from 'discord.js';
import { getNumberProperty } from '../../lib/type-guards';
import type {
  ComponentMessageEditor,
  LifecycleComponent,
  TrackedComponentMessage,
} from './component-lifecycle.types';

const PRIVATE_COMPONENT_IDLE_MS = 14 * 60_000;
const lifetimes = new Map<string, number>();
const trackedMessages = new Map<string, TrackedComponentMessage>();

const matchesLifetime = (customId: string, key: string) =>
  customId === key || customId.startsWith(`${key}:`);

const getExpiration = (customId: string) => {
  const parts = customId.split(':');
  while (parts.length) {
    const expiration = lifetimes.get(parts.join(':'));
    if (expiration !== undefined) return expiration;
    parts.pop();
  }
  return undefined;
};

const getCustomIds = (components: readonly LifecycleComponent[]): string[] =>
  components.flatMap((component) => {
    if (component.type === ComponentType.Section) {
      const accessory = component.accessory;
      return 'custom_id' in accessory ? [accessory.custom_id] : [];
    }
    if (component.type === ComponentType.ActionRow)
      return component.components.flatMap((child) =>
        'custom_id' in child ? [child.custom_id] : [],
      );
    if (component.type === ComponentType.Container)
      return getCustomIds(component.components);
    return [];
  });

const stripControls = (
  component: LifecycleComponent,
  shouldRemove: (customId: string) => boolean,
): LifecycleComponent[] => {
  if (component.type === ComponentType.ActionRow) {
    const components = component.components.filter(
      (child) => !('custom_id' in child && shouldRemove(child.custom_id)),
    );
    return components.length ? [{ ...component, components }] : [];
  }
  if (component.type === ComponentType.Container) {
    const components = component.components.flatMap((child) =>
      stripControls(child, shouldRemove),
    );
    const children = components.filter(
      (child) => child.type !== ComponentType.Container,
    );
    return children.length ? [{ ...component, components: children }] : [];
  }
  if (component.type === ComponentType.Section) {
    const accessory = component.accessory;
    if ('custom_id' in accessory && shouldRemove(accessory.custom_id))
      return component.components;
  }
  return [component];
};

const forgetMessage = (id: string) => {
  const previous = trackedMessages.get(id);
  if (previous) clearTimeout(previous.timer);
  trackedMessages.delete(id);
};

const getDeadline = (
  tracked: Pick<TrackedComponentMessage, 'customIds' | 'idleExpiresAt'>,
) => {
  const expirations = tracked.customIds.flatMap((customId) => {
    const expiration = getExpiration(customId);
    return expiration === undefined ? [] : [expiration];
  });
  if (expirations.length && tracked.idleExpiresAt !== null)
    expirations.push(tracked.idleExpiresAt);
  return Math.min(...expirations);
};

const scheduleCleanup = (
  id: string,
  delayMs: number,
  forcedRemoval?: (customId: string) => boolean,
) => {
  const timer = setTimeout(
    () => {
      const tracked = trackedMessages.get(id);
      if (!tracked) return;
      void cleanMessage(id, tracked, (customId) => {
        if (forcedRemoval) return forcedRemoval(customId);
        const idleExpired =
          tracked.idleExpiresAt !== null && tracked.idleExpiresAt <= Date.now();
        const expiration = getExpiration(customId);
        if (idleExpired) return expiration !== undefined;
        return expiration !== undefined && expiration <= Date.now();
      });
    },
    Math.max(0, delayMs),
  );
  timer.unref();
  return timer;
};

const cleanMessage = async (
  id: string,
  tracked: TrackedComponentMessage,
  shouldRemove: (customId: string) => boolean,
) => {
  try {
    const message = await tracked.fetch();
    if (trackedMessages.get(id) !== tracked) return;
    const components = message.components.flatMap((component) =>
      stripControls(component.toJSON(), shouldRemove),
    );
    await tracked.edit({ components });
    if (trackedMessages.get(id) !== tracked) return;
    tracked.customIds = getCustomIds(components);
    const deadline = getDeadline(tracked);
    if (tracked.customIds.length && Number.isFinite(deadline)) {
      tracked.timer = scheduleCleanup(id, deadline - Date.now());
      return;
    }
    forgetMessage(id);
  } catch (error) {
    if (trackedMessages.get(id) !== tracked) return;
    const permanentError = [10008, 10015, 50001, 50013].includes(
      getNumberProperty(error, 'code') ?? 0,
    );
    if (!permanentError && tracked.retries < 3) {
      tracked.retries += 1;
      tracked.timer = scheduleCleanup(id, 10_000, shouldRemove);
      return;
    }
    forgetMessage(id);
    console.error('Could not remove expired Discord controls.', error);
  }
};

export const registerComponentLifetime = (key: string, expiresAt: number) => {
  lifetimes.set(key, expiresAt);
};

export const expireComponentLifetime = async (key: string) => {
  lifetimes.delete(key);
  await Promise.all(
    [...trackedMessages].map(async ([id, tracked]) => {
      if (
        tracked.customIds.some((customId) => matchesLifetime(customId, key))
      ) {
        clearTimeout(tracked.timer);
        await cleanMessage(id, tracked, (customId) =>
          matchesLifetime(customId, key),
        );
      }
    }),
  );
};

export const trackComponentMessage = (
  message: Message | undefined,
  edit?: ComponentMessageEditor,
  fetch?: () => Promise<Message>,
) => {
  if (!message?.components) return;
  forgetMessage(message.id);
  const customIds = getCustomIds(
    message.components.map((component) => component.toJSON()),
  );
  if (!customIds.length) return;
  if (!customIds.some((customId) => getExpiration(customId) !== undefined))
    return;
  const tracked: Omit<TrackedComponentMessage, 'timer'> = {
    customIds,
    idleExpiresAt: message.flags.has(MessageFlags.Ephemeral)
      ? Date.now() + PRIVATE_COMPONENT_IDLE_MS
      : null,
    edit: edit ?? ((options) => message.edit(options)),
    fetch: fetch ?? (() => message.fetch()),
    retries: 0,
  };
  const deadline = getDeadline(tracked);
  if (!Number.isFinite(deadline)) return;
  trackedMessages.set(message.id, {
    ...tracked,
    timer: scheduleCleanup(message.id, deadline - Date.now()),
  });
};

export const trackInteractionComponentReply = async (
  interaction: Interaction,
) => {
  if (!('fetchReply' in interaction)) return;
  if (!interaction.replied) return;
  try {
    const message = await interaction.fetchReply();
    if (message.flags.has(MessageFlags.Ephemeral)) {
      trackComponentMessage(
        message,
        (options) => interaction.editReply(options),
        () => interaction.fetchReply(),
      );
      return;
    }
    trackComponentMessage(message);
  } catch (error) {
    console.error('Could not track Discord controls.', error);
  }
};
