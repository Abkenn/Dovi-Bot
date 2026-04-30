import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { BotGuildId } from './discord-access';
import { isAllowedGuildForCommand } from './discord-access';

const replyOrEditGuildAccessError = async (
  interaction: ChatInputCommandInteraction,
  content: string,
) => {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      content,
      embeds: [],
    });

    return;
  }

  await interaction.reply({
    content,
    flags: MessageFlags.Ephemeral,
  });
};

export const assertCommandGuildAccess = async <
  TAllowedGuildIds extends readonly BotGuildId[],
>(
  interaction: ChatInputCommandInteraction,
  allowedGuildIds: TAllowedGuildIds,
): Promise<TAllowedGuildIds[number] | null> => {
  const guildId = interaction.guildId;

  if (!guildId) {
    await replyOrEditGuildAccessError(
      interaction,
      'This command can only be used in a server.',
    );

    return null;
  }

  if (!isAllowedGuildForCommand(guildId, allowedGuildIds)) {
    await replyOrEditGuildAccessError(
      interaction,
      'This server is not allowed to use this command.',
    );

    return null;
  }

  return guildId;
};
