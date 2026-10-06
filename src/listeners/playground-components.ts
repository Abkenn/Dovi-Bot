import { Listener } from '@sapphire/framework';
import { Events, type Interaction } from 'discord.js';
import { trackInteractionComponentReply } from '../modules/discord/component-lifecycle';
import { handlePlaygroundInteraction } from '../modules/playground/playground.service';

export class PlaygroundComponentsListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, { ...options, event: Events.InteractionCreate });
  }

  public override async run(interaction: Interaction) {
    try {
      await handlePlaygroundInteraction(interaction);
    } catch (error) {
      this.container.logger.error('Playground interaction failed.', error);
    } finally {
      await trackInteractionComponentReply(interaction);
    }
  }
}
