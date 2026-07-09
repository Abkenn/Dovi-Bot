import { advanceReactionEchoCounter } from '../../data/queries/reaction-echo';
import type {
  ProcessReactionEchoMessageInput,
  ReactionEchoMessage,
  ReactionEchoResponse,
  ReactionEchoRule,
  ReactionEchoTrigger,
} from './reaction-echo.types';

const hasCustomEmoji = (content: string, emojiId: string) =>
  content.includes(`:${emojiId}>`);

const hasTriggerMatch = (
  message: ReactionEchoMessage,
  trigger: ReactionEchoTrigger,
) => {
  if (trigger.kind === 'STICKER') {
    return message.stickerIds.includes(trigger.stickerId);
  }

  return hasCustomEmoji(message.content, trigger.emojiId);
};

const countRuleMatches = (
  message: ReactionEchoMessage,
  rule: ReactionEchoRule,
) => {
  if (!rule.guildIds.includes(message.guildId)) {
    return 0;
  }

  if (rule.channelIds && !rule.channelIds.includes(message.channelId)) {
    return 0;
  }

  return rule.triggers.some((trigger) => hasTriggerMatch(message, trigger))
    ? 1
    : 0;
};

const sendResponse = async (
  message: ReactionEchoMessage,
  response: ReactionEchoResponse,
) => {
  if (response.kind === 'STICKER') {
    await message.sendSticker(response.stickerId);
    return;
  }

  await message.addReaction(response.emojiId);
};

export const processReactionEchoMessage = async ({
  message,
  rules,
}: ProcessReactionEchoMessageInput) => {
  if (message.authorIsBot) {
    return;
  }

  for (const rule of rules) {
    const incrementBy = countRuleMatches(message, rule);

    if (incrementBy === 0) {
      continue;
    }

    const shouldEcho = await advanceReactionEchoCounter({
      ruleId: rule.id,
      every: rule.threshold,
      incrementBy,
    });

    if (shouldEcho) {
      await sendResponse(message, rule.response);
    }
  }
};
