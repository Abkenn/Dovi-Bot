import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { runCommand } from '../modules/command-runner/run-command';
import { buildHltbMessage } from '../modules/hltb/hltb.discord';
import { findHltbGame } from '../modules/hltb/hltb.service';

const METADATA = COMMAND_METADATA.HLTB;

export class HltbCommand extends Command {
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
        const game = await findHltbGame(
          interaction.options.getString('game', true),
          signal,
        );

        return editReply({
          content: game ? buildHltbMessage(game) : 'Game not found.',
        });
      },
    });
  }
}
