import { Listener } from '@sapphire/framework';
import { BOT_GUILDS, COMMAND_GUILDS } from '../config/discord-access';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { removeDisabledProdPingMeCommand } from '../modules/ping-me/ping-me-command-registration';

export class PingMeCommandCleanupListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: 'applicationCommandRegistriesRegistered',
    });
  }

  public override async run() {
    const applicationCommands = this.container.client.application?.commands;

    if (!applicationCommands) {
      return;
    }

    try {
      const removed = await removeDisabledProdPingMeCommand({
        fetch: (options) => applicationCommands.fetch(options),
        deleteCommand: (commandId, guildId) =>
          applicationCommands.delete(commandId, guildId),
        commandName: COMMAND_METADATA.PING_ME.name,
        prodGuildId: BOT_GUILDS.PROD_ENV,
        prodRegistrationEnabled: COMMAND_GUILDS.PING_ME.includes(
          BOT_GUILDS.PROD_ENV,
        ),
      });

      if (removed) {
        this.container.logger.info('Removed disabled prod /ping-me command.');
      }
    } catch (error) {
      this.container.logger.error(
        'Failed to remove disabled prod /ping-me command.',
        error,
      );
    }
  }
}
