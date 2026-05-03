import type { ChatInputCommandInteraction } from 'discord.js';
import { CommandDeniedError } from '../modules/command-logging/command-denied';
import type { BotGuildId } from './discord-access';
import { isAllowedGuildForCommand } from './discord-access';

export const assertCommandGuildAccess = async <
  TAllowedGuildIds extends readonly BotGuildId[],
>(
  interaction: ChatInputCommandInteraction,
  allowedGuildIds: TAllowedGuildIds,
): Promise<TAllowedGuildIds[number]> => {
  const guildId = interaction.guildId;

  if (!guildId) {
    throw new CommandDeniedError('This command can only be used in a server.');
  }

  if (!isAllowedGuildForCommand(guildId, allowedGuildIds)) {
    throw new CommandDeniedError(
      'This server is not allowed to use this command.',
    );
  }

  return guildId;
};
