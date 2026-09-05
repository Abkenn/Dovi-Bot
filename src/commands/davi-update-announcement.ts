import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION, BOT_GUILDS } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { MusicMode, StreamKind } from '../generated/prisma/client';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { PROD_STREAM_ANNOUNCEMENT_ROLE_ID } from '../modules/stream-info/stream-announcement.config';
import type {
  BuildStreamAnnouncementChangePreviewInput,
  PrepareStreamAnnouncementChangeInput,
  StreamAnnouncementChangeAction,
} from '../modules/stream-info/stream-announcement.types';
import { prepareStreamAnnouncementChange } from '../modules/stream-info/stream-announcement-change.service';
import { buildStreamAnnouncementChangePreview } from '../modules/stream-info/stream-info.discord';

const METADATA = COMMAND_METADATA.DAVI_UPDATE_ANNOUNCEMENT;

const getStreamKind = (value: string | null) =>
  Object.values(StreamKind).find((kind) => kind === value);

const getMusicMode = (value: string | null) =>
  Object.values(MusicMode).find((mode) => mode === value);

const getAction = (value: string | null): StreamAnnouncementChangeAction => {
  if (value === 'PUSH' || value === 'DELETE') {
    return value;
  }
  return 'UPDATE';
};

export class DaviUpdateAnnouncementCommand extends Command {
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
              .setName('action')
              .setDescription('Preview an update, manual push, or deletion')
              .addChoices(
                { name: 'Update', value: 'UPDATE' },
                { name: 'Manual Push', value: 'PUSH' },
                { name: 'Delete', value: 'DELETE' },
              ),
          )
          .addStringOption((option) =>
            option
              .setName('announcement_message')
              .setDescription('Announcement message ID to update or delete')
              .setMinLength(17)
              .setMaxLength(20),
          )
          .addStringOption((option) =>
            option
              .setName('type')
              .setDescription('Optional stream type')
              .addChoices(
                { name: 'Game', value: StreamKind.GAME },
                { name: 'Music', value: StreamKind.MUSIC },
                { name: 'Other', value: StreamKind.OTHER },
              ),
          )
          .addStringOption((option) =>
            option
              .setName('music_mode')
              .setDescription('Optional music mode')
              .addChoices(
                { name: 'Democracy', value: MusicMode.DEMOCRACY },
                { name: 'Dictatorship', value: MusicMode.DICTATORSHIP },
                { name: 'Capitalism', value: MusicMode.CAPITALISM },
                {
                  name: 'Patreon Capitalism',
                  value: MusicMode.PATREON_CAPITALISM,
                },
                { name: 'Unknown', value: MusicMode.UNKNOWN },
              ),
          )
          .addStringOption((option) =>
            option
              .setName('music_theme')
              .setDescription('Optional theme for a music stream'),
          )
          .addStringOption((option) =>
            option.setName('game').setDescription('Optional game name'),
          )
          .addStringOption((option) =>
            option.setName('title').setDescription('Optional title override'),
          )
          .addStringOption((option) =>
            option
              .setName('stream_url')
              .setDescription('Optional YouTube stream URL'),
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
      run: async ({ editReply }) => {
        const input: PrepareStreamAnnouncementChangeInput = {
          action: getAction(interaction.options.getString('action')),
          requestedByUserId: interaction.user.id,
        };
        const announcementMessageId = interaction.options.getString(
          'announcement_message',
        );
        const streamKind = getStreamKind(interaction.options.getString('type'));
        const musicMode = getMusicMode(
          interaction.options.getString('music_mode'),
        );
        const musicTheme = interaction.options.getString('music_theme');
        const gameName = interaction.options.getString('game');
        const title = interaction.options.getString('title');
        const streamUrl = interaction.options.getString('stream_url');

        if (announcementMessageId)
          input.announcementMessageId = announcementMessageId;
        if (streamKind) input.streamKind = streamKind;
        if (musicMode) input.musicMode = musicMode;
        if (musicTheme) input.musicTheme = musicTheme;
        if (gameName) input.gameName = gameName;
        if (title) input.title = title;
        if (streamUrl) input.streamUrl = streamUrl;

        const result = await prepareStreamAnnouncementChange(input);
        const previewInput: BuildStreamAnnouncementChangePreviewInput = {
          action: result.action,
          requestId: result.requestId,
          streamInfo: result.streamInfo,
          streamUrl: result.streamUrl,
        };
        if (result.targetGuildId === BOT_GUILDS.PROD_ENV) {
          previewInput.roleId = PROD_STREAM_ANNOUNCEMENT_ROLE_ID;
        }

        return editReply(buildStreamAnnouncementChangePreview(previewInput));
      },
    });
  }
}
