import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { runCommand } from '../modules/command-runner/run-command';
import { buildMusicSearchReply } from '../modules/music/music.discord';
import { searchMusicCatalog } from '../modules/music/music.service';

const METADATA = COMMAND_METADATA.MUSIC_SEARCH;

export class MusicSearchCommand extends Command {
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
              .setName('query')
              .setDescription('Song or game name, approximate spelling is fine')
              .setRequired(true)
              .setMinLength(2)
              .setMaxLength(100),
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
      run: async ({ editReply }) =>
        editReply(
          buildMusicSearchReply(
            await searchMusicCatalog(
              interaction.options.getString('query', true),
            ),
          ),
        ),
    });
  }
}
