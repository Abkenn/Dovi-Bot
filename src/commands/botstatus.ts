import { Command } from '@sapphire/framework';
import { BOT_GUILDS } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildBotStatusMessage } from '../modules/bot-status/bot-status.discord';
import { fetchBotStatus } from '../modules/bot-status/bot-status.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.BOT_STATUS;

export class BotStatusCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
      {
        guildIds: [...METADATA.guildIds],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId, signal }) => {
        const status = await fetchBotStatus({
          includeDatabase: guildId === BOT_GUILDS.STAGING_ENV,
          signal,
        });

        return editReply({
          componentMessage: buildBotStatusMessage(status),
        });
      },
    });
  }
}
