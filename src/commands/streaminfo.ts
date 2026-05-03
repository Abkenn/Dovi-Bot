import { Command } from '@sapphire/framework';
import { COMMAND_GUILDS } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { getStreamInfoEmbed } from '../modules/stream-info/get-stream-info-embed';

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
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.STREAM_INFO),
      run: async ({ editReply, preflight: guildId }) => {
        return editReply({
          embeds: [await getStreamInfoEmbed(guildId)],
        });
      },
    });
  }
}
