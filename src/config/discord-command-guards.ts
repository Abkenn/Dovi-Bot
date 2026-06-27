import type { BaseInteraction, ChatInputCommandInteraction } from 'discord.js';
import { CommandDeniedError } from '../modules/command-logging/command-denied';
import { BOT_GUILDS, isAllowedGuildForCommand } from './discord-access';
import {
  type CommandAccess,
  evaluateCommandAccess,
} from './discord-command-access';
import {
  type CommandMetadata,
  HELP_COMMANDS,
} from './discord-command-metadata';

type CommandAccessInteraction = Pick<
  BaseInteraction,
  'guild' | 'guildId' | 'member'
>;

const getInteractionRoleIds = (
  interaction: CommandAccessInteraction,
): readonly string[] => {
  const roles = interaction.member?.roles;

  if (!roles) {
    return [];
  }

  return Array.isArray(roles) ? roles : [...roles.cache.keys()];
};

const getInteractionRoleNames = (
  interaction: CommandAccessInteraction,
  roleIds: readonly string[],
): string[] =>
  roleIds.flatMap((roleId) => {
    const roleName = interaction.guild?.roles.cache.get(roleId)?.name;

    return roleName ? [roleName] : [];
  });

export const evaluateInteractionCommandAccess = (
  interaction: CommandAccessInteraction,
  access: CommandAccess,
) => {
  const roleIds = getInteractionRoleIds(interaction);

  return evaluateCommandAccess({
    access,
    isProdGuild: interaction.guildId === BOT_GUILDS.PROD_ENV,
    roleIds,
    roleNames: getInteractionRoleNames(interaction, roleIds),
  });
};

export const isInteractionCommandAccessible = (
  interaction: CommandAccessInteraction,
  commandName: string,
): boolean => {
  const metadata = HELP_COMMANDS.find(
    (command) => command.name === commandName,
  );
  const guildId = interaction.guildId;

  if (
    !metadata ||
    !guildId ||
    !isAllowedGuildForCommand(guildId, metadata.guildIds)
  ) {
    return false;
  }

  return evaluateInteractionCommandAccess(interaction, metadata.access).allowed;
};

export const assertCommandAccess = async <TMetadata extends CommandMetadata>(
  interaction: ChatInputCommandInteraction,
  metadata: TMetadata,
): Promise<TMetadata['guildIds'][number]> => {
  const guildId = interaction.guildId;

  if (!guildId) {
    throw new CommandDeniedError('This command can only be used in a server.');
  }

  if (!isAllowedGuildForCommand(guildId, metadata.guildIds)) {
    throw new CommandDeniedError(
      'This server is not allowed to use this command.',
    );
  }

  const evaluation = evaluateInteractionCommandAccess(
    interaction,
    metadata.access,
  );

  if (!evaluation.allowed) {
    throw new CommandDeniedError(evaluation.message, {
      ephemeral: evaluation.ephemeral,
    });
  }

  return guildId;
};
