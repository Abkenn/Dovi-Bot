import { Listener } from '@sapphire/framework';
import { Events, type Message, type PartialMessage } from 'discord.js';
import { recordDeletedMessage } from '../modules/message-logging/message-logging.service';

export class MessageLoggingDeleteListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.MessageDelete,
    });
  }

  public override async run(message: Message | PartialMessage) {
    if (!message.inGuild() || message.author?.bot) {
      return;
    }

    try {
      await recordDeletedMessage(message);
    } catch (error) {
      console.error('Failed to record deleted message.', error);
    }
  }
}
