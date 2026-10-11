import { type Client, type Message, MessageFlags } from 'discord.js';
import { z } from 'zod';
import { getNumberProperty } from '../../lib/type-guards';
import type { SeasonalTheme } from './seasonal-command-theme.types';
import {
  getSeasonalActivityButtons,
  stripSeasonalEye,
  updateSeasonalEffectComponents,
} from './seasonal-message-effects.discord';
import { getBotSeasonalTheme } from './seasonal-theme.service';

type Effect = {
  messageId: string;
  channelId: string;
  buttonSwapAt: Date;
  buttonRestoreAt: Date;
  eyeExpiresAt: Date;
  eyeEmoji: string;
  originalButtons: unknown;
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
  fetchMessage: () => Promise<Message>,
  delay: number,
) => {
  setTimeout(
    () => void advance(effect, fetchMessage),
    Math.max(0, delay),
  ).unref();
};

const advance = async (
  effect: Effect,
  fetchMessage: () => Promise<Message>,
) => {
  try {
    const theme = await getBotSeasonalTheme();
    const message = await fetchMessage();
    const now = Date.now();
    const expired = now >= effect.eyeExpiresAt.getTime();
    const disabled = theme?.emoji !== effect.eyeEmoji;
    const removeTextEye = expired || disabled;
    const showButtonEye =
      !removeTextEye &&
      now >= effect.buttonSwapAt.getTime() &&
      now < effect.buttonRestoreAt.getTime();
    const currentComponents = message.components.map((component) =>
      component.toJSON(),
    );
    const components = updateSeasonalEffectComponents(
      currentComponents,
      buttonSnapshots.parse(effect.originalButtons),
      effect.eyeEmoji,
      showButtonEye,
      removeTextEye,
    );
    const content = removeTextEye
      ? stripSeasonalEye(message.content, effect.eyeEmoji)
      : message.content;
    const changedComponents =
      JSON.stringify(components) !== JSON.stringify(currentComponents);
    const changedContent = content !== message.content;
    if (changedComponents || changedContent) {
      const options: Parameters<Message['edit']>[0] = { components };
      if (changedContent) options.content = content;
      await message.edit(options);
    }
    if (removeTextEye) {
      await (await loadQueries()).deleteSeasonalMessageEffect(effect.messageId);
      tracked.delete(effect.messageId);
      return;
    }
    const deadlines = [
      effect.buttonSwapAt,
      effect.buttonRestoreAt,
      effect.eyeExpiresAt,
    ];
    const next = deadlines.find((deadline) => deadline.getTime() > now);
    if (next) schedule(effect, fetchMessage, next.getTime() - Date.now());
  } catch (error) {
    const permanent = [10008, 10003].includes(
      getNumberProperty(error, 'code') ?? 0,
    );
    if (permanent) {
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
) => {
  if (!message?.guildId || message.flags.has(MessageFlags.Ephemeral)) return;
  if (!theme.effects || tracked.has(message.id)) return;
  const { emojiLifetimeMs, activityButton } = theme.effects;
  const eyeEmoji = theme.emoji;
  const components = message.components.map((component) => component.toJSON());
  const originalButtons = activityButton
    ? getSeasonalActivityButtons(components)
    : [];
  const hasTextEye =
    JSON.stringify(components).includes(eyeEmoji) ||
    message.content.startsWith(`${eyeEmoji} `);
  if (!originalButtons.length && !hasTextEye) return;
  tracked.add(message.id);
  const startedAt = new Date();
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
        (activityButton?.delayMs ?? 0) +
        (activityButton?.durationMs ?? 0),
    ),
    eyeExpiresAt: new Date(startedAt.getTime() + emojiLifetimeMs),
    eyeEmoji,
    originalButtons,
  };
  const effect = await loadQueries()
    .then((queries) => queries.saveSeasonalMessageEffect(input))
    .catch((error: unknown) => {
      console.error(
        'Could not persist seasonal message cleanup; keeping the live timer.',
        error,
      );
      return input;
    });
  schedule(
    effect,
    () => message.fetch(),
    (originalButtons.length
      ? effect.buttonSwapAt
      : effect.eyeExpiresAt
    ).getTime() - Date.now(),
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
          Math.max(
            0,
            (buttonSnapshots.parse(effect.originalButtons).length
              ? effect.buttonSwapAt
              : effect.eyeExpiresAt
            ).getTime() - Date.now(),
          ),
        );
      }
    } catch (error) {
      console.error('Could not recover seasonal message effects.', error);
      setTimeout(() => void recover(), 60000).unref();
    }
  };
  void recover();
};
