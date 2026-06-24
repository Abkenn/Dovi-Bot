import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { PING_ME_COMMAND_CONFIG } from '../modules/ping-me/ping-me.config';
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
              .setName('new_keywords')
              .setDescription('Comma-delimited keywords to add')
              .setMaxLength(1_000),
          )
          .addStringOption((option) =>
            option
              .setName('clear')
              .setDescription('Remove one of your keywords')
              .setAutocomplete(true),
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
      withCommandLogging: PING_ME_COMMAND_CONFIG.withCommandLogging,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply, preflight: sourceGuildId }) => {
        const result = await getPingMeCommandResult({
          userId: interaction.user.id,
          sourceGuildId,
          newKeywordsInput: interaction.options.getString('new_keywords'),
          clearKeyword: interaction.options.getString('clear'),
        });

        return editReply(result);
      },
    });
  }
}
