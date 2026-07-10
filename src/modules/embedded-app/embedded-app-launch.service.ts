import { type ButtonInteraction, MessageFlags } from 'discord.js';
import { getNumberProperty } from '../../lib/type-guards';

const MISSING_EMBEDDED_FLAG_CODE = 50234;

export const launchEmbeddedAppStats = async (
  interaction: ButtonInteraction,
) => {
  try {
    await interaction.launchActivity();
  } catch (error) {
    if (getNumberProperty(error, 'code') !== MISSING_EMBEDDED_FLAG_CODE) {
      throw error;
    }

    await interaction.reply({
      content:
        'Live Stats needs Activities enabled in the Discord Developer Portal.',
      flags: MessageFlags.Ephemeral,
    });
  }
};
