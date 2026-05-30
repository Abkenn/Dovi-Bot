import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { updateLiveGameInfo } from '../modules/boss-tracking/boss-tracking.service';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';
import { setDefaultGameName } from '../modules/stream-info/stream-info.service';

const METADATA = COMMAND_METADATA.SET_GAME;

export class SetGameCommand extends Command {
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
              .setName('game')
              .setDescription('Default game name')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('aliases')
              .setDescription('Names people type for the game, comma-separated')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('tags')
              .setDescription(
                'Extra topic words like shorthand, comma-separated',
              )
              .setRequired(false),
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
        const game = interaction.options.getString('game', true);
        const aliases = interaction.options.getString('aliases');
        const tags = interaction.options.getString('tags');

        await setDefaultGameName(guildId, game);
        await updateLiveGameInfo({
          guildId,
          userId: interaction.user.id,
          gameName: game,
          aliases,
          contextWords: tags,
        });

        return editReply({
          content: `Default game for future regular game streams updated to **${game}**.`,
          embeds: [await getStreamInfoEmbed(guildId)],
        });
      },
    });
  }
}
