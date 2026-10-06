import { type Interaction, MessageFlags } from 'discord.js';
import {
  ADMIN_COMMAND_PERMISSION,
  BOT_GUILDS,
} from '../../config/discord-access';
import { getNumberProperty } from '../../lib/type-guards';
import {
  buildPlaygroundModal,
  formatPlaygroundSubmission,
} from './playground.discord';

export const handlePlaygroundInteraction = async (interaction: Interaction) => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith('playground:')) return;
  const [prefix, action, ownerId, expiration] = interaction.customId.split(':');
  if (prefix !== 'playground' || (action !== 'open' && action !== 'modal'))
    return;
  if (
    interaction.guildId !== BOT_GUILDS.STAGING_ENV ||
    !interaction.memberPermissions?.has(ADMIN_COMMAND_PERMISSION) ||
    ownerId !== interaction.user.id
  ) {
    await interaction.reply({
      content: 'This playground is only available to its staging operator.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const expiresAt = Number(expiration);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await interaction.reply({
      content: 'This playground demo expired. Run `/playground modal` again.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (interaction.isButton() && action === 'open') {
    try {
      await interaction.showModal(
        buildPlaygroundModal(interaction.user.id, expiresAt),
      );
    } catch (error) {
      if (getNumberProperty(error, 'code') !== 50035) throw error;
      await interaction.reply({
        content:
          'Discord rejected these demo components. They may not be enabled for this application or client yet.',
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }
  if (interaction.isModalSubmit() && action === 'modal') {
    await interaction.reply({
      content: formatPlaygroundSubmission({
        streamType: interaction.fields.getRadioGroup('stream-type', true),
        features: interaction.fields.getCheckboxGroup('features'),
        reminders: interaction.fields.getCheckbox('reminders'),
      }),
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    });
  }
};
