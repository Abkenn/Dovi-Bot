import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import {
  buildHelpMessage,
  isHelpTopicValue,
} from '../modules/help/help.discord';

const METADATA = COMMAND_METADATA.HELP;

export class HelpCommand extends Command {
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
              .setName('topic')
              .setDescription('Browse help topics')
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
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply, preflight: guildId }) => {
        const topic = interaction.options.getString('topic');

        return editReply({
          componentMessage: buildHelpMessage({
            canManageGuild:
              interaction.memberPermissions?.has(ADMIN_COMMAND_PERMISSION) ??
              false,
            guildId,
            topic: topic && isHelpTopicValue(topic) ? topic : null,
          }),
        });
      },
    });
  }
}
