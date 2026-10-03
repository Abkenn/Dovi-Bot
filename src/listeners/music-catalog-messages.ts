import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';
import { importMusicUpload } from '../modules/music/music.service';

export class MusicCatalogMessagesListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, { ...options, event: Events.MessageCreate });
  }

  public override async run(message: Message) {
    if (!message.inGuild() || message.author.bot) return;
    for (const attachment of message.attachments.values()) {
      try {
        await importMusicUpload({
          authorId: message.author.id,
          guildId: message.guildId,
          messageId: message.id,
          attachmentId: attachment.id,
          filename: attachment.name,
          url: attachment.url,
          size: attachment.size,
        });
      } catch (error) {
        console.error(
          'Music catalog upload failed; previous catalog retained.',
          { messageId: message.id, attachmentId: attachment.id, error },
        );
      }
    }
  }
}
