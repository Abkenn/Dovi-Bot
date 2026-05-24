import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import {
  EPHEMERAL_COMMAND_REPLY,
  withCommandLogging,
} from '../modules/command-logging/with-command-logging';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';
import { setDefaultGameName } from '../modules/stream-info/stream-info.service';

export class SetGameCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'setgame',
      description: 'Sets the default game for future regular game streams.',
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
              .setName('game')
              .setDescription('Default game name')
              .setRequired(true),
          ),
      {
        guildIds: [...COMMAND_GUILDS.SET_GAME],
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
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.SET_GAME),
      run: async ({ editReply, preflight: guildId }) => {
        const game = interaction.options.getString('game', true);

        await setDefaultGameName(guildId, game);

        return editReply({
          content: `Default game for future regular game streams updated to **${game}**.`,
          embeds: [await getStreamInfoEmbed(guildId)],
        });
      },
    });
  }
}
