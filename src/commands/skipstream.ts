import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { Weekday } from '../generated/prisma/client';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';
import { skipStream } from '../modules/stream-info/stream-info.service';
import { refreshGuildStreamInfoMessages } from '../modules/stream-info/stream-info-message-updater.service';

const METADATA = COMMAND_METADATA.SKIP_STREAM;

export class SkipStreamCommand extends Command {
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
              .setName('day')
              .setDescription('Optional stream day to skip')
              .addChoices(
                { name: 'Thursday', value: Weekday.THURSDAY },
                { name: 'Friday', value: Weekday.FRIDAY },
                { name: 'Saturday', value: Weekday.SATURDAY },
              ),
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
      run: async ({ editReply, preflight: guildId }) => {
        await skipStream({
          guildId,
          targetWeekday: interaction.options.getString('day') as Weekday | null,
        });
        await refreshGuildStreamInfoMessages({
          client: this.container.client,
          guildId,
        });

        return editReply({
          content: 'Stream skipped.',
          embeds: [await getStreamInfoEmbed(guildId)],
        });
      },
    });
  }
}
