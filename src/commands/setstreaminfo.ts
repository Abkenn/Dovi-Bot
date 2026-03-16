import { Command } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import { MusicMode, StreamKind } from '../generated/prisma/client';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import {
  getStreamInfo,
  setStreamInfo,
} from '../modules/stream-info/stream-info.service';

export class SetStreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'setstreaminfo',
      description:
        'Updates the current stream if ongoing, otherwise the next stream.',
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
              .setName('date')
              .setDescription('Optional date override in YYYY-MM-DD'),
          )
          .addStringOption((option) =>
            option
              .setName('time')
              .setDescription('Optional time override in HH:mm'),
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
        guildIds: [env.DISCORD_GUILD_ID],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId ?? env.DISCORD_GUILD_ID;

    await setStreamInfo({
      guildId,
      date: interaction.options.getString('date'),
      time: interaction.options.getString('time'),
      streamKind: interaction.options.getString('type') as StreamKind | null,
      musicMode: interaction.options.getString(
        'music_mode',
      ) as MusicMode | null,
      gameName: interaction.options.getString('game'),
      title: interaction.options.getString('title'),
    });

    const streamInfo = await getStreamInfo(guildId);
    const embed = buildStreamInfoEmbed(streamInfo);

    return interaction.editReply({
      content: 'Stream info updated.',
      embeds: [embed],
    });
  }
}
