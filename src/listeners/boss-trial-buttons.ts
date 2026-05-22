import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { parseBossTrialButtonAction } from '../modules/boss-stats/boss-trial.discord';
import {
  postBossTrialBumpMessage,
  postBossTrialResultsMessage,
  refreshBossTrialMessage,
} from '../modules/boss-stats/boss-trial.lifecycle';
import {
  getBossTrialView,
  markBossTrialFinalResultsPosted,
  recordBossTrialVote,
  shouldShowBossTrialVotes,
} from '../modules/boss-stats/boss-trial.service';
import { BOSS_TRIAL_VERDICT_LABELS } from '../modules/boss-stats/boss-trial.types';

const getVoteConfirmationMessage = ({
  voteAction,
  verdictLabel,
  previousVerdictLabel,
}: {
  voteAction: 'created' | 'changed' | 'unchanged';
  verdictLabel: string;
  previousVerdictLabel: string | null;
}) => {
  if (voteAction === 'unchanged') {
    return `Your vote is already **${verdictLabel}**. Click another verdict if you want to change it.`;
  }

  if (voteAction === 'changed' && previousVerdictLabel) {
    return `Changed your vote from **${previousVerdictLabel}** to **${verdictLabel}**.`;
  }

  return `Your **${verdictLabel}** vote was recorded. Click another verdict if you change your mind.`;
};

export class BossTrialButtonsListener extends Listener {
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

    const action = parseBossTrialButtonAction(interaction.customId);

    if (!action) {
      return;
    }

    try {
      if (action.type === 'vote') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const voteResult = await recordBossTrialVote({
          trialId: action.trialId,
          userId: interaction.user.id,
          verdict: action.verdict,
        });

        if (
          voteResult.voteAction !== 'unchanged' &&
          shouldShowBossTrialVotes(voteResult.trial)
        ) {
          await refreshBossTrialMessage(
            this.container.client,
            voteResult.trial,
          );
        }

        return interaction.editReply({
          content: getVoteConfirmationMessage({
            voteAction: voteResult.voteAction,
            verdictLabel: BOSS_TRIAL_VERDICT_LABELS[action.verdict],
            previousVerdictLabel: voteResult.previousVerdict
              ? BOSS_TRIAL_VERDICT_LABELS[voteResult.previousVerdict]
              : null,
          }),
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const trial = await getBossTrialView(action.trialId);

      if (interaction.user.id !== trial.requesterUserId) {
        return interaction.editReply({
          content: 'Only the boss trial requester can use these controls.',
        });
      }

      if (action.type === 'bump') {
        if (!trial.messageId) {
          return interaction.editReply({
            content: 'I could not bump this poll yet. Try again in a bit.',
          });
        }

        if (Date.now() >= trial.endsAt.getTime()) {
          return interaction.editReply({
            content: 'This boss trial is already finished.',
          });
        }

        await postBossTrialBumpMessage({
          client: this.container.client,
          trial,
          isAutomatic: false,
        });

        return interaction.editReply({
          content: 'Bumped the boss trial poll.',
        });
      }

      if (Date.now() < trial.endsAt.getTime()) {
        return interaction.editReply({
          content: 'Scheduled results have not been posted yet.',
        });
      }

      let currentTrial = trial;

      await postBossTrialResultsMessage({
        client: this.container.client,
        trial: currentTrial,
      });

      if (!currentTrial.finalResultsPostedAt) {
        currentTrial = await markBossTrialFinalResultsPosted(currentTrial.id);
      }

      await refreshBossTrialMessage(this.container.client, currentTrial);

      return interaction.editReply({
        content: 'Published the latest boss trial results.',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong with this boss trial interaction.';

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: message });
      }

      return interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
