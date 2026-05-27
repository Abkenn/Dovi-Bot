import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';

const METADATA = COMMAND_METADATA.STREAM_INFO;

export class StreamInfoCommand extends Command {
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
    return withCommandLogging({
      interaction,
      commandName: this.name,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply, preflight: guildId }) => {
        return editReply({
          embeds: [await getStreamInfoEmbed(guildId)],
        });
      },
    });
  }
}
