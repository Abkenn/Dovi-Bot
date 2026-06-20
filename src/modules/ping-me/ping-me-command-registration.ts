import type { RemoveDisabledProdPingMeCommandInput } from './ping-me.types';

export const removeDisabledProdPingMeCommand = async ({
  fetch,
  deleteCommand,
  commandName,
  prodGuildId,
  prodRegistrationEnabled,
}: RemoveDisabledProdPingMeCommandInput): Promise<boolean> => {
  if (prodRegistrationEnabled) {
    return false;
  }

  const commands = await fetch({ guildId: prodGuildId });
  let staleCommandId: string | null = null;

  for (const command of commands.values()) {
    if (command.name === commandName) {
      staleCommandId = command.id;
      break;
    }
  }

  if (!staleCommandId) {
    return false;
  }

  await deleteCommand(staleCommandId, prodGuildId);
  return true;
};
