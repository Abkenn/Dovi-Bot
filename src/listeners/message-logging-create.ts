import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';
import { recordRecentChannelMessage } from '../modules/message-logging/message-logging.service';

export class MessageLoggingCreateListener extends Listener {
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
    if (!message.inGuild() || message.author.bot) {
      return;
    }

    try {
      await recordRecentChannelMessage(message);
    } catch (error) {
      console.error('Failed to record recent channel message.', error);
    }
  }
}
