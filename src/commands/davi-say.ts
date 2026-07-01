import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import {
  getDaviSayTargetGuildId,
  resolveDaviSayDestination,
  sendDaviSayMessage,
} from '../modules/davi-say/davi-say.service';
import type { DaviSayEnvironment } from '../modules/davi-say/davi-say.types';

const METADATA = COMMAND_METADATA.DAVI_SAY;

const isDaviSayEnvironment = (value: string): value is DaviSayEnvironment =>
  value === 'prod' || value === 'staging';

export class DaviSayCommand extends Command {
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
          .setDefaultMemberPermissions(ADMIN_COMMAND_PERMISSION)
          .addStringOption((option) =>
            option
              .setName('message')
              .setDescription('Message for Davi to send')
              .setMaxLength(2000),
          )
          .addStringOption((option) =>
            option
              .setName('env')
              .setDescription('Server to search when choosing a channel')
              .addChoices(
                { name: 'prod', value: 'prod' },
                { name: 'staging', value: 'staging' },
              ),
          )
          .addStringOption((option) =>
            option
              .setName('channel')
              .setDescription('Channel or active thread ID')
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('sticker')
              .setDescription('Server sticker for Davi to send')
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
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply }) => {
        const message = interaction.options.getString('message');
        const channelId = interaction.options.getString('channel');
        const stickerId = interaction.options.getString('sticker');
        const environmentOption = interaction.options.getString('env');
        const selectedEnvironment =
          environmentOption && isDaviSayEnvironment(environmentOption)
            ? environmentOption
            : null;
        const destination = resolveDaviSayDestination({
          selectedChannelId: channelId,
          selectedEnvironment,
        });
        const targetGuildId = getDaviSayTargetGuildId(destination.environment);

        await sendDaviSayMessage({
          client: interaction.client,
          channelId: destination.channelId,
          message,
          stickerId,
        });

        return editReply({
          content: `Sent in <#${destination.channelId}> (${destination.environment}, ${targetGuildId}).`,
        });
      },
    });
  }
}
