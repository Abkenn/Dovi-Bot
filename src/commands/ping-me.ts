import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { getPingMeCommandResult } from '../modules/ping-me/ping-me.service';

const METADATA = COMMAND_METADATA.PING_ME;

export class PingMeCommand extends Command {
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
              .setName('keywords')
              .setDescription('Comma-delimited keywords; replaces this profile')
              .setMaxLength(1_000),
          )
          .addBooleanOption((option) =>
            option
              .setName('clear')
              .setDescription('Remove this server profile'),
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
      deferReplyOptions: EPHEMERAL_COMMAND_REPLY,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply, preflight: sourceGuildId }) => {
        const result = await getPingMeCommandResult({
          userId: interaction.user.id,
          sourceGuildId,
          keywordsInput: interaction.options.getString('keywords'),
          clear: interaction.options.getBoolean('clear') ?? false,
        });

        return editReply(result);
      },
    });
  }
}
