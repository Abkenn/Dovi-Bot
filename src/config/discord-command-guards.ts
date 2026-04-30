import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { BotGuildId } from './discord-access';
import { isAllowedGuildForCommand } from './discord-access';

export const assertCommandGuildAccess = async <
  TAllowedGuildIds extends readonly BotGuildId[],
>(
  interaction: ChatInputCommandInteraction,
  allowedGuildIds: TAllowedGuildIds,
): Promise<TAllowedGuildIds[number] | null> => {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });

    return null;
  }

  if (!isAllowedGuildForCommand(guildId, allowedGuildIds)) {
    await interaction.reply({
      content: 'This server is not allowed to use this command.',
      flags: MessageFlags.Ephemeral,
    });

    return null;
  }

  return guildId;
};
