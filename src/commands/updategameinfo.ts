import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { updateLiveGameInfo } from '../modules/boss-tracking/boss-tracking.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.UPDATE_GAME_INFO;

export class UpdateGameInfoCommand extends Command {
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
              .setDescription('Game to update, defaults to the stream game')
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Display name for the game')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('aliases')
              .setDescription('Names people type for the game, comma-separated')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('tags')
              .setDescription(
                'Extra topic words like shorthand, comma-separated',
              )
              .setRequired(false),
          )
          .addIntegerOption((option) =>
            option
              .setName('deaths')
              .setDescription('Current total game deaths')
              .setMinValue(0)
              .setRequired(false),
          ),
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
      run: async ({ editReply, preflight: guildId }) => {
        const result = await updateLiveGameInfo({
          guildId,
          userId: interaction.user.id,
          gameName: interaction.options.getString('game'),
          name: interaction.options.getString('name'),
          aliases: interaction.options.getString('aliases'),
          contextWords: interaction.options.getString('tags'),
          deaths: interaction.options.getInteger('deaths'),
        });

        return editReply({
          content: [
            result.updatedName
              ? `Updated game name to **${result.gameName}**.`
              : `Updated **${result.gameName}**.`,
            result.updatedDeaths !== null
              ? `Set deaths to ${result.updatedDeaths}.`
              : null,
            result.addedCount > 0
              ? `Added ${result.addedCount} topic term${result.addedCount === 1 ? '' : 's'}.`
              : null,
          ]
            .filter(Boolean)
            .join(' '),
        });
      },
    });
  }
}
