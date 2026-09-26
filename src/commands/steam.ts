import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { runCommand } from '../modules/command-runner/run-command';
import { buildSteamMessage } from '../modules/steam/steam.discord';
import { findSteamGame } from '../modules/steam/steam.service';

const METADATA = COMMAND_METADATA.STEAM;

export class SteamCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option
              .setName('game')
              .setDescription('Game title')
              .setRequired(true)
              .setAutocomplete(true),
          ),
      { guildIds: [...METADATA.guildIds] },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, signal }) => {
        const game = await findSteamGame(
          interaction.options.getString('game', true),
          signal,
        );
        return editReply({
          content: game ? buildSteamMessage(game) : 'Game not found.',
        });
      },
    });
  }
}
