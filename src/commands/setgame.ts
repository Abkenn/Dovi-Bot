import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import {
  COMMAND_TIMEOUT_MS,
  withTimeout,
} from '../modules/command-logging/command-timeout';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import {
  getStreamInfo,
  setDefaultGameName,
} from '../modules/stream-info/stream-info.service';

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
      run: async () => {
        const guildId = await assertCommandGuildAccess(
          interaction,
          COMMAND_GUILDS.SET_GAME,
        );

        if (!guildId) {
          return;
        }

        const game = interaction.options.getString('game', true);

        await withTimeout(
          setDefaultGameName(guildId, game),
          COMMAND_TIMEOUT_MS,
        );

        const streamInfo = await withTimeout(
          getStreamInfo(guildId),
          COMMAND_TIMEOUT_MS,
        );
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          content: `Default game for future regular game streams updated to **${game}**.`,
          embeds: [embed],
        });
      },
    });
  }
}
