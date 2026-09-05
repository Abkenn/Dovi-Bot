import { setStreamAnnouncementDecision } from '@data/queries/stream-announcement';
import { Listener } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { BOT_GUILDS } from '../config/discord-access';
import { STREAM_ANNOUNCEMENT_REVIEW_USER_ID } from '../modules/stream-info/stream-announcement.config';
import {
  applyStreamAnnouncementChange,
  declineStreamAnnouncementChange,
} from '../modules/stream-info/stream-announcement-change.service';
import {
  STREAM_ANNOUNCEMENT_AUTO_APPROVE_CUSTOM_ID_PREFIX,
  STREAM_ANNOUNCEMENT_AUTO_DECLINE_CUSTOM_ID_PREFIX,
  STREAM_ANNOUNCEMENT_CHANGE_APPROVE_CUSTOM_ID_PREFIX,
  STREAM_ANNOUNCEMENT_CHANGE_DECLINE_CUSTOM_ID_PREFIX,
} from '../modules/stream-info/stream-info.discord';

const APPLIED_ACTION_LABELS = {
  UPDATE: 'Update',
  PUSH: 'Manual push',
  DELETE: 'Deletion',
} as const;

const getSuffix = (customId: string, prefix: string) =>
  customId.startsWith(`${prefix}:`) ? customId.slice(prefix.length + 1) : null;

export class StreamAnnouncementButtonsListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, { ...options, event: Events.InteractionCreate });
  }

  public override async run(interaction: Interaction) {
    if (!interaction.isButton()) {
      return;
    }

    const approveDateKey = getSuffix(
      interaction.customId,
      STREAM_ANNOUNCEMENT_AUTO_APPROVE_CUSTOM_ID_PREFIX,
    );
    const declineDateKey = getSuffix(
      interaction.customId,
      STREAM_ANNOUNCEMENT_AUTO_DECLINE_CUSTOM_ID_PREFIX,
    );
    const decisionDateKey = approveDateKey ?? declineDateKey;
    if (decisionDateKey) {
      if (interaction.user.id !== STREAM_ANNOUNCEMENT_REVIEW_USER_ID) {
        return interaction.reply({
          content: 'Only Abken can review this announcement.',
          flags: MessageFlags.Ephemeral,
        });
      }
      const approved = approveDateKey !== null;
      await setStreamAnnouncementDecision({
        guildId: BOT_GUILDS.PROD_ENV,
        streamDateKey: decisionDateKey,
        decision: approved ? 'APPROVED' : 'DECLINED',
      });

      return interaction.update({
        content: approved
          ? 'Automatic production announcement approved.'
          : 'Automatic production announcement declined. Use `/davi-update-announcement action:Manual Push` when it is ready.',
        components: [],
        allowedMentions: { parse: [] },
      });
    }

    const approveRequestId = getSuffix(
      interaction.customId,
      STREAM_ANNOUNCEMENT_CHANGE_APPROVE_CUSTOM_ID_PREFIX,
    );
    const declineRequestId = getSuffix(
      interaction.customId,
      STREAM_ANNOUNCEMENT_CHANGE_DECLINE_CUSTOM_ID_PREFIX,
    );
    const requestId = approveRequestId ?? declineRequestId;
    if (!requestId) {
      return;
    }

    await interaction.deferUpdate();
    try {
      if (approveRequestId) {
        const action = await applyStreamAnnouncementChange({
          client: interaction.client,
          requestId,
          userId: interaction.user.id,
        });
        return interaction.editReply({
          content: `${APPLIED_ACTION_LABELS[action]} approved and applied.`,
          components: [],
        });
      }

      await declineStreamAnnouncementChange(requestId, interaction.user.id);
      return interaction.editReply({
        content: 'Announcement change declined.',
        components: [],
      });
    } catch (error) {
      return interaction.editReply({
        content:
          error instanceof Error
            ? error.message
            : 'The announcement change failed.',
        components: [],
      });
    }
  }
}
