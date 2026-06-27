import { type InteractionReplyOptions, MessageFlags } from 'discord.js';

export const buildCommandErrorReplyOptions = (
  message: string,
  ephemeral: boolean,
): InteractionReplyOptions => {
  const replyOptions: InteractionReplyOptions = {
    content: message,
  };

  if (ephemeral) {
    replyOptions.flags = MessageFlags.Ephemeral;
  }

  return replyOptions;
};
