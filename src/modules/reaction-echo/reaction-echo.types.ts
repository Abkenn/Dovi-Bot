export type ReactionEchoTrigger =
  | { kind: 'STICKER'; stickerId: string }
  | { kind: 'CUSTOM_EMOJI'; emojiId: string };

export type ReactionEchoResponse =
  | { kind: 'STICKER'; stickerId: string }
  | { kind: 'REACTION'; emojiId: string };

export type ReactionEchoRule = {
  id: string;
  guildIds: readonly string[];
  channelIds?: readonly string[];
  trigger: ReactionEchoTrigger;
  response: ReactionEchoResponse;
  threshold: number;
};

export type ReactionEchoMessage = {
  guildId: string;
  channelId: string;
  authorIsBot: boolean;
  content: string;
  stickerIds: readonly string[];
  sendSticker: (stickerId: string) => Promise<void>;
  addReaction: (emojiId: string) => Promise<void>;
};

export type ProcessReactionEchoMessageInput = {
  message: ReactionEchoMessage;
  rules: readonly ReactionEchoRule[];
};
