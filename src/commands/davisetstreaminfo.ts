import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  BOT_GUILDS,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { MusicMode, StreamKind } from '../generated/prisma/client';
import {
  COMMAND_TIMEOUT_MS,
  withTimeout,
} from '../modules/command-logging/command-timeout';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import {
  getStreamInfo,
  setStreamInfo,
} from '../modules/stream-info/stream-info.service';

export class DaviSetStreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'davisetstreaminfo',
      description: 'Updates the prod env current/next stream from staging.',
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
        guildIds: [...COMMAND_GUILDS.DAVI_SET_STREAM_INFO],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return withCommandLogging({
      interaction,
      commandName: this.name,
      ephemeral: true,
      run: async () => {
        const sourceGuildId = await assertCommandGuildAccess(
          interaction,
          COMMAND_GUILDS.DAVI_SET_STREAM_INFO,
        );

        if (!sourceGuildId) {
          return;
        }

        const targetGuildId = BOT_GUILDS.PROD_ENV;

        await withTimeout(
          setStreamInfo({
            guildId: targetGuildId,
            streamKind: interaction.options.getString(
              'type',
            ) as StreamKind | null,
            musicMode: interaction.options.getString(
              'music_mode',
            ) as MusicMode | null,
            gameName: interaction.options.getString('game'),
            title: interaction.options.getString('title'),
          }),
          COMMAND_TIMEOUT_MS,
        );

        const streamInfo = await withTimeout(
          getStreamInfo(targetGuildId),
          COMMAND_TIMEOUT_MS,
        );
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          content: 'Prod env stream info updated.',
          embeds: [embed],
        });
      },
    });
  }
}
