import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  BOT_GUILDS,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import {
  EPHEMERAL_COMMAND_REPLY,
  withCommandLogging,
} from '../modules/command-logging/with-command-logging';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';
import { setDefaultGameName } from '../modules/stream-info/stream-info.service';

export class DaviSetGameCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'davisetgame',
      description: 'Sets the prod env default game from staging.',
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
        guildIds: [...COMMAND_GUILDS.DAVI_SET_GAME],
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
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.DAVI_SET_GAME),
      run: async ({ editReply }) => {
        const game = interaction.options.getString('game', true);
        const targetGuildId = BOT_GUILDS.PROD_ENV;

        await setDefaultGameName(targetGuildId, game);

        return editReply({
          content: `Prod env default game updated to **${game}**.`,
          embeds: [await getStreamInfoEmbed(targetGuildId)],
        });
      },
    });
  }
}
