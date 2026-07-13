import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type InteractionReplyOptions,
  MessageFlags,
} from 'discord.js';
import { getNumberProperty } from '../../lib/type-guards';
import { registerEmbeddedAppLaunchTarget } from './embedded-app-launch-target.service';

const MISSING_EMBEDDED_FLAG_CODE = 50234;
const UNSUPPORTED_ACTIVITY_CHANNEL_CODE = 50024;
const UNKNOWN_INTERACTION_CODE = 10062;

const replySafely = async (
  interaction: ButtonInteraction,
  reply: InteractionReplyOptions,
) => {
  if (interaction.replied || interaction.deferred) {
    return;
  }

  try {
    await interaction.reply(reply);
  } catch (error) {
    if (getNumberProperty(error, 'code') !== UNKNOWN_INTERACTION_CODE) {
      throw error;
    }
  }
};

const buildActivityDeepLink = (
  applicationId: string,
  gameName?: string | null,
) => {
  const url = new URL(`https://discord.com/activities/${applicationId}`);

  if (gameName) {
    url.searchParams.set('custom_id', gameName);
  }

  return url.toString();
};

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
    const errorCode = getNumberProperty(error, 'code');

    if (errorCode === UNSUPPORTED_ACTIVITY_CHANNEL_CODE) {
      await replySafely(interaction, {
        content: 'Open Live Stats in Discord:',
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel('Stats')
              .setEmoji('\u{1F4CA}')
              .setStyle(ButtonStyle.Link)
              .setURL(
                buildActivityDeepLink(interaction.applicationId, gameName),
              ),
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (errorCode !== MISSING_EMBEDDED_FLAG_CODE) {
      throw error;
    }

    await replySafely(interaction, {
      content:
        'Live Stats needs Activities enabled in the Discord Developer Portal.',
      flags: MessageFlags.Ephemeral,
    });
  }
};
