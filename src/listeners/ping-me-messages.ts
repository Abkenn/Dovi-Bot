import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';
import { BOT_GUILDS } from '../config/discord-access';
import { sendPingMeNotification } from '../modules/ping-me/ping-me.discord';
import { findPingMeNotifications } from '../modules/ping-me/ping-me.service';

const isPingMeGuild = (guildId: string) =>
  guildId === BOT_GUILDS.STAGING_ENV || guildId === BOT_GUILDS.PROD_ENV;

export class PingMeMessagesListener extends Listener {
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
    if (
      !message.inGuild() ||
      message.author.bot ||
      !isPingMeGuild(message.guildId) ||
      !message.content
    ) {
      return;
    }

    try {
      const notifications = await findPingMeNotifications({
        guildId: message.guildId,
        authorUserId: message.author.id,
        content: message.content,
      });
      const results = await Promise.allSettled(
        notifications.map((notification) =>
          sendPingMeNotification(message, notification),
        ),
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('Failed to send ping-me notification.', result.reason);
        }
      }
    } catch (error) {
      console.error('Failed to process ping-me message.', error);
    }
  }
}
