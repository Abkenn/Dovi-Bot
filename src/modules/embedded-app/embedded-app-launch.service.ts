import { type ButtonInteraction, MessageFlags } from 'discord.js';
import { getNumberProperty } from '../../lib/type-guards';
import { registerEmbeddedAppLaunchTarget } from './embedded-app-launch-target.service';

const MISSING_EMBEDDED_FLAG_CODE = 50234;
const UNKNOWN_INTERACTION_CODE = 10062;

export const launchEmbeddedAppStats = async (
  interaction: ButtonInteraction,
  gameName?: string | null,
) => {
  try {
    const response = await interaction.launchActivity({ withResponse: true });
    const instanceId = response.interaction.activityInstanceId;

    if (instanceId && gameName) {
      registerEmbeddedAppLaunchTarget(instanceId, gameName);
    }
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
