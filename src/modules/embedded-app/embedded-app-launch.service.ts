import { type ButtonInteraction, MessageFlags } from 'discord.js';
import { getNumberProperty } from '../../lib/type-guards';

const MISSING_EMBEDDED_FLAG_CODE = 50234;
const UNKNOWN_INTERACTION_CODE = 10062;

export const launchEmbeddedAppStats = async (
  interaction: ButtonInteraction,
) => {
  try {
    await interaction.launchActivity();
  } catch (error) {
    if (getNumberProperty(error, 'code') !== MISSING_EMBEDDED_FLAG_CODE) {
      throw error;
    }

    if (interaction.replied || interaction.deferred) {
      return;
    }

    try {
      await interaction.reply({
        content:
          'Live Stats needs Activities enabled in the Discord Developer Portal.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      if (getNumberProperty(replyError, 'code') !== UNKNOWN_INTERACTION_CODE) {
        throw replyError;
      }
    }
  }
};
