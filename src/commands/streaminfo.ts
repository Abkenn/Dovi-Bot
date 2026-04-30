import { Command } from '@sapphire/framework';
import { COMMAND_GUILDS } from '../config/discord-access';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import { getStreamInfo } from '../modules/stream-info/stream-info.service';

export class StreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'streaminfo',
      description: 'Shows current and next stream information.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
      {
        guildIds: [...COMMAND_GUILDS.STREAM_INFO],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return withCommandLogging({
      interaction,
      commandName: this.name,
      run: async () => {
        await interaction.deferReply();

        const guildId = interaction.guildId;

        if (!guildId) {
          return interaction.editReply({
            content: 'This command can only be used in a server.',
            embeds: [],
          });
        }

        const streamInfo = await getStreamInfo(guildId);
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          embeds: [embed],
        });
      },
    });
  }
}
