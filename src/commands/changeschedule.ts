import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { StreamKind } from '../generated/prisma/client';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';
import { changeStreamSchedule } from '../modules/stream-info/stream-info.service';
import { parseWeekday } from '../modules/stream-info/stream-info.utils';
import { refreshGuildStreamInfoMessages } from '../modules/stream-info/stream-info-message-updater.service';

const METADATA = COMMAND_METADATA.CHANGE_SCHEDULE;

export class ChangeScheduleCommand extends Command {
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
              .setName('type')
              .setDescription('Replacement stream type')
              .setRequired(true)
              .addChoices(
                { name: 'Game', value: StreamKind.GAME },
                { name: 'Music', value: StreamKind.MUSIC },
              ),
          )
          .addStringOption((option) =>
            option
              .setName('day')
              .setDescription('Scheduled stream day')
              .setRequired(true)
              .addChoices(
                { name: 'Friday', value: 'FRIDAY' },
                { name: 'Saturday', value: 'SATURDAY' },
              ),
          ),
      { guildIds: [...METADATA.guildIds] },
    );
  }

  public override chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      deferReplyOptions: EPHEMERAL_COMMAND_REPLY,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        const targetWeekday = parseWeekday(
          interaction.options.getString('day', true),
        );
        const requestedType = interaction.options.getString('type', true);
        const streamKind =
          requestedType === StreamKind.GAME
            ? StreamKind.GAME
            : StreamKind.MUSIC;

        if (targetWeekday !== 'FRIDAY' && targetWeekday !== 'SATURDAY') {
          throw new Error('Choose Friday or Saturday.');
        }

        await changeStreamSchedule({ guildId, targetWeekday, streamKind });
        await refreshGuildStreamInfoMessages({
          client: this.container.client,
          guildId,
        });

        return editReply({
          content: 'Schedule updated.',
          embeds: [await getStreamInfoEmbed(guildId)],
        });
      },
    });
  }
}
