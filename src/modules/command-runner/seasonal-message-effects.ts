import {
  type ButtonInteraction,
  type Client,
  ComponentType,
  type Message,
  type MessageEditOptions,
  MessageFlags,
} from 'discord.js';
import { z } from 'zod';
import type { SeasonalButtonSnapshot } from '../../data/queries/seasonal-message-effects.types';
import { getNumberProperty } from '../../lib/type-guards';
import type { SeasonalTheme } from './seasonal-command-theme.types';
import {
  getSeasonalActivityButtons,
  getSeasonalButtonCycle,
  getSeasonalTitlePulse,
  stripSeasonalEye,
  updateSeasonalEffectComponents,
} from './seasonal-message-effects.discord';
import { getBotSeasonalTheme } from './seasonal-theme.service';

type Effect = {
  persistent?: boolean;
  messageId: string;
  startedAt: Date;
  channelId: string;
  buttonSwapAt: Date;
  buttonRestoreAt: Date;
  eyeExpiresAt: Date;
  eyeEmoji: string;
  originalButtons: unknown;
};

type PrivateSeasonalReply = {
  interaction: Pick<ButtonInteraction, 'fetchReply' | 'editReply'>;
  originalButtons: readonly SeasonalButtonSnapshot[];
};
type EffectMessage = Pick<Message, 'content' | 'components'> & {
  edit: (options: MessageEditOptions) => Promise<unknown>;
};

const buttonSnapshots = z.array(
  z.object({
    customId: z.string(),
    emoji: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        animated: z.boolean().optional(),
      })
      .nullable(),
  }),
);
const tracked = new Set<string>();
let recoveryStarted = false;

const loadQueries = () => import('../../data/queries/seasonal-message-effects');

const schedule = (
  effect: Effect,
  fetchMessage: () => Promise<EffectMessage>,
  delay: number,
) => {
  setTimeout(
    () => void advance(effect, fetchMessage),
    Math.max(0, delay),
  ).unref();
};

const advance = async (
  effect: Effect,
  fetchMessage: () => Promise<EffectMessage>,
) => {
  try {
    const theme = await getBotSeasonalTheme();
    const message = await fetchMessage();
    const now = Date.now();
    const expired = now >= effect.eyeExpiresAt.getTime();
    const disabled = theme?.emoji !== effect.eyeEmoji;
    const removeTextEye = expired || disabled;
    const buttons = buttonSnapshots.parse(effect.originalButtons);
    const cycleMs = theme?.effects?.activityButton?.cycleMs;
    const buttonWindow =
      !disabled &&
      now >= effect.buttonSwapAt.getTime() &&
      now < effect.buttonRestoreAt.getTime();
    const phase = cycleMs
      ? Math.floor((now - effect.buttonSwapAt.getTime()) / cycleMs)
      : 0;
    const showButtonEye =
      buttonWindow && cycleMs
        ? getSeasonalButtonCycle(effect.messageId, buttons, phase)
        : buttonWindow;
    const currentComponents = message.components.map((component) =>
      component.toJSON(),
    );
    const titleConfig = theme?.effects?.titlePulse;
    const hasSeasonalTitle = currentComponents.some(
      (component) =>
        component.type === ComponentType.Container &&
        component.accent_color === theme?.accentColor,
    );
    const titlePulse =
      titleConfig && hasSeasonalTitle && !removeTextEye
        ? getSeasonalTitlePulse(
            effect.messageId,
            now - effect.startedAt.getTime(),
            titleConfig,
          )
        : null;
    const components = updateSeasonalEffectComponents(
      currentComponents,
      buttons,
      effect.eyeEmoji,
      showButtonEye,
      removeTextEye,
      titlePulse?.visible,
    );
    const content = removeTextEye
      ? stripSeasonalEye(message.content, effect.eyeEmoji)
      : message.content;
    const changedComponents =
      JSON.stringify(components) !== JSON.stringify(currentComponents);
    const changedContent = content !== message.content;
    if (changedComponents || changedContent) {
      const options: MessageEditOptions = { components };
      if (changedContent) options.content = content;
      await message.edit(options);
    }
    if (disabled || (expired && now >= effect.buttonRestoreAt.getTime())) {
      if (effect.persistent !== false)
        await (await loadQueries()).deleteSeasonalMessageEffect(
          effect.messageId,
        );
      tracked.delete(effect.messageId);
      return;
    }
    const deadlines = [
      effect.buttonSwapAt,
      effect.buttonRestoreAt,
      effect.eyeExpiresAt,
    ];
    if (buttonWindow && cycleMs && buttons.length)
      deadlines.push(
        new Date(effect.buttonSwapAt.getTime() + (phase + 1) * cycleMs),
      );
    if (titlePulse)
      deadlines.push(
        new Date(effect.startedAt.getTime() + titlePulse.nextChangeMs),
      );
    const next = deadlines
      .filter((deadline) => deadline.getTime() > now)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (next) schedule(effect, fetchMessage, next.getTime() - Date.now());
  } catch (error) {
    const permanent = [10008, 10003].includes(
      getNumberProperty(error, 'code') ?? 0,
    );
    if (permanent) {
      if (effect.persistent !== false)
        await (await loadQueries())
          .deleteSeasonalMessageEffect(effect.messageId)
          .catch(() => undefined);
      tracked.delete(effect.messageId);
    } else {
      schedule(effect, fetchMessage, 5000);
      console.error('Could not advance seasonal message effect.', error);
    }
  }
};

export const trackSeasonalMessageEffects = async (
  message: Message | undefined,
  theme: SeasonalTheme,
  privateReply?: PrivateSeasonalReply,
) => {
  if (!message?.guildId) return;
  const isPrivate = message.flags.has(MessageFlags.Ephemeral);
  const privateInteraction = privateReply?.interaction;
  if (isPrivate && !privateInteraction) return;
  if (!theme.effects || tracked.has(message.id)) return;
  const { emojiLifetimeMs, activityButton } = theme.effects;
  const eyeEmoji = theme.emoji;
  const components = message.components.map((component) => component.toJSON());
  const originalButtons = activityButton
    ? [
        ...(privateReply?.originalButtons ??
          getSeasonalActivityButtons(components)),
      ]
    : [];
  const hasTextEye =
    JSON.stringify(components).includes(eyeEmoji) ||
    message.content.startsWith(`${eyeEmoji} `);
  if (!originalButtons.length && !hasTextEye) return;
  tracked.add(message.id);
  const hasTitleEye = JSON.stringify(components).includes(`# ${eyeEmoji} `);
  const titleLifetime = hasTitleEye
    ? (theme.effects.titlePulse?.lifetimeMs ?? emojiLifetimeMs)
    : emojiLifetimeMs;
  const startedAt = new Date();
  const maxAge = isPrivate ? 14 * 60000 : Number.POSITIVE_INFINITY;
  const input = {
    messageId: message.id,
    guildId: message.guildId,
    channelId: message.channelId,
    startedAt,
    buttonSwapAt: new Date(
      startedAt.getTime() + (activityButton?.delayMs ?? 0),
    ),
    buttonRestoreAt: new Date(
      startedAt.getTime() +
        Math.min(
          maxAge,
          (activityButton?.cycleMs ? 0 : (activityButton?.delayMs ?? 0)) +
            (activityButton?.durationMs ?? 0),
        ),
    ),
    eyeExpiresAt: new Date(
      startedAt.getTime() + Math.min(maxAge, titleLifetime),
    ),
    eyeEmoji,
    originalButtons,
  };
  const effect = isPrivate
    ? { ...input, persistent: false }
    : await loadQueries()
        .then((queries) => queries.saveSeasonalMessageEffect(input))
        .catch((error: unknown) => {
          console.error(
            'Could not persist seasonal message cleanup; keeping the live timer.',
            error,
          );
          return input;
        });
  const firstDeadline = Math.min(
    originalButtons.length
      ? effect.buttonSwapAt.getTime()
      : effect.eyeExpiresAt.getTime(),
    hasTitleEye && theme.effects.titlePulse
      ? startedAt.getTime() + theme.effects.titlePulse.visibleMs
      : Number.POSITIVE_INFINITY,
  );
  schedule(
    effect,
    privateInteraction
      ? async () => {
          const current = await privateInteraction.fetchReply();
          return {
            content: current.content,
            components: current.components,
            edit: (options) => privateInteraction.editReply(options),
          };
        }
      : () => message.fetch(),
    firstDeadline - Date.now(),
  );
};

export const startSeasonalMessageEffectRecovery = (client: Client) => {
  if (recoveryStarted) return;
  recoveryStarted = true;
  const recover = async () => {
    try {
      const effects = await (await loadQueries()).findSeasonalMessageEffects();
      for (const effect of effects) {
        if (tracked.has(effect.messageId)) continue;
        tracked.add(effect.messageId);
        schedule(
          effect,
          async () => {
            const channel = await client.channels.fetch(effect.channelId);
            if (!channel?.isTextBased() || !('messages' in channel))
              throw Object.assign(
                new Error('Seasonal message channel is unavailable.'),
                { code: 10003 },
              );
            return channel.messages.fetch(effect.messageId);
          },
          0,
        );
      }
    } catch (error) {
      console.error('Could not recover seasonal message effects.', error);
      setTimeout(() => void recover(), 60000).unref();
    }
  };
  void recover();
};
