import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION, BOT_GUILDS } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { MusicMode, StreamKind } from '../generated/prisma/client';
import {
  EPHEMERAL_COMMAND_REPLY,
  withCommandLogging,
} from '../modules/command-logging/with-command-logging';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';
import { setStreamInfo } from '../modules/stream-info/stream-info.service';

const METADATA = COMMAND_METADATA.DAVI_SET_STREAM_INFO;

export class DaviSetStreamInfoCommand extends Command {
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
                { name: 'Unknown', value: MusicMode.UNKNOWN },
              ),
          )
          .addStringOption((option) =>
            option.setName('game').setDescription('Optional game name'),
          )
          .addStringOption((option) =>
            option.setName('title').setDescription('Optional title override'),
          ),
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
      deferReplyOptions: EPHEMERAL_COMMAND_REPLY,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply }) => {
        const targetGuildId = BOT_GUILDS.PROD_ENV;

        await setStreamInfo({
          guildId: targetGuildId,
          streamKind: interaction.options.getString(
            'type',
          ) as StreamKind | null,
          musicMode: interaction.options.getString(
            'music_mode',
          ) as MusicMode | null,
          gameName: interaction.options.getString('game'),
          title: interaction.options.getString('title'),
        });

        return editReply({
          content: 'Prod env stream info updated.',
          embeds: [await getStreamInfoEmbed(targetGuildId)],
        });
      },
    });
  }
}
