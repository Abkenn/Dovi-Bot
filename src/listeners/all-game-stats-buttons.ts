import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import {
  buildShowAllGameStatsPageMessage,
  parseAllGameStatsPageAction,
} from '../modules/boss-encounter-stats/game/game-encounter-stats.discord';
import { getAllGameBossDeathRanking } from '../modules/bosses/bosses.service';

export class AllGameStatsButtonsListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public override async run(interaction: Interaction) {
    if (!interaction.isButton()) {
      return;
    }

    const action = parseAllGameStatsPageAction(interaction.customId);

    if (!action) {
      return;
    }

    if (interaction.user.id !== action.requesterUserId) {
      return interaction.reply({
        content: 'Only the person who requested these stats can change pages.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const ranking = await getAllGameBossDeathRanking({ limit: null });

    return interaction.update(
      buildShowAllGameStatsPageMessage({
        ranking,
        page: action.page,
        requesterUserId: action.requesterUserId,
      }),
    );
  }
}
