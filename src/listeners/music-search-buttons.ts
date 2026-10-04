import { Listener } from '@sapphire/framework';
import { Events, type Interaction } from 'discord.js';
import { handleMusicSearchPage } from '../modules/music/music-pagination';

export class MusicSearchButtonsListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, { ...options, event: Events.InteractionCreate });
  }

  public override async run(interaction: Interaction) {
    if (!interaction.isButton()) return;
    try {
      return await handleMusicSearchPage(interaction);
    } catch (error) {
      console.error('Could not update music search page.', error);
    }
  }
}
