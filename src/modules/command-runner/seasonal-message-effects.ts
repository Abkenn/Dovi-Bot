import { type Client, type Message, MessageFlags } from 'discord.js';
import { z } from 'zod';
import {
  SEASONAL_BUTTON_EYE_DELAY_MS,
  SEASONAL_BUTTON_EYE_DURATION_MS,
  SEASONAL_EYE_MAX_AGE_MS,
} from '../../config/seasonal-themes';
import { getNumberProperty } from '../../lib/type-guards';
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
const scheduled = new Map<string, NodeJS.Timeout>();
const running = new Set<string>();
let recoveryStarted = false;

const loadQueries = () => import('../../data/queries/seasonal-message-effects');

const schedule = (
  effect: Effect,
  fetchMessage: () => Promise<Message>,
  delay: number,
) => {
  const timer = setTimeout(
    () => {
      scheduled.delete(effect.messageId);
      void advance(effect, fetchMessage);
    },
    Math.max(0, delay),
  );
  timer.unref();
  scheduled.set(effect.messageId, timer);
};

const advance = async (
  effect: Effect,
  fetchMessage: () => Promise<Message>,
) => {
  if (running.has(effect.messageId)) return;
  running.add(effect.messageId);
  try {
    const theme = await getBotSeasonalTheme();
    const message = await fetchMessage();
    const now = Date.now();
    const expired = now >= effect.eyeExpiresAt.getTime();
    const disabled = theme?.id !== 'halloween';
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
    } else {
      schedule(effect, fetchMessage, 5000);
      console.error('Could not advance seasonal message effect.', error);
    }
  } finally {
    running.delete(effect.messageId);
  }
};

export const trackSeasonalMessageEffects = async (
  message: Message | undefined,
  eyeEmoji: string,
) => {
  if (!message?.guildId || message.flags.has(MessageFlags.Ephemeral)) return;
  if (scheduled.has(message.id) || running.has(message.id)) return;
  const components = message.components.map((component) => component.toJSON());
  const originalButtons = getSeasonalActivityButtons(components);
  const hasTextEye =
    JSON.stringify(components).includes(eyeEmoji) ||
    message.content.startsWith(`${eyeEmoji} `);
  if (!originalButtons.length && !hasTextEye) return;
  const startedAt = new Date();
  const input = {
    messageId: message.id,
    guildId: message.guildId,
    channelId: message.channelId,
    startedAt,
    buttonSwapAt: new Date(startedAt.getTime() + SEASONAL_BUTTON_EYE_DELAY_MS),
    buttonRestoreAt: new Date(
      startedAt.getTime() +
        SEASONAL_BUTTON_EYE_DELAY_MS +
        SEASONAL_BUTTON_EYE_DURATION_MS,
    ),
    eyeExpiresAt: new Date(startedAt.getTime() + SEASONAL_EYE_MAX_AGE_MS),
    eyeEmoji,
    originalButtons,
  };
  const effect = await (await loadQueries())
    .saveSeasonalMessageEffect(input)
    .catch((error: unknown) => {
      console.error(
        'Could not persist seasonal message cleanup; keeping the live timer.',
        error,
      );
      return input;
    });
  if (scheduled.has(message.id) || running.has(message.id)) return;
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
        if (scheduled.has(effect.messageId) || running.has(effect.messageId))
          continue;
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
    }
  };
  void recover();
  setInterval(() => void recover(), 60000).unref();
};
