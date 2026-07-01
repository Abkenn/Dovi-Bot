import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';
import { REACTION_ECHO_RULES } from '../modules/reaction-echo/reaction-echo.config';
import { processReactionEchoMessage } from '../modules/reaction-echo/reaction-echo.service';

export class ReactionEchoMessagesListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.MessageCreate,
    });
  }

  public override async run(message: Message) {
    if (!message.inGuild() || !message.channel.isSendable()) {
      return;
    }

    try {
      await processReactionEchoMessage({
        message: {
          guildId: message.guildId,
          channelId: message.channelId,
          authorIsBot: message.author.bot,
          content: message.content,
          stickerIds: [...message.stickers.keys()],
          sendSticker: async (stickerId) => {
            await message.channel.send({ stickers: [stickerId] });
          },
          addReaction: async (emojiId) => {
            await message.react(emojiId);
          },
        },
        rules: REACTION_ECHO_RULES,
      });
    } catch (error) {
      console.error('Failed to process reaction echo message.', error);
    }
  }
}
