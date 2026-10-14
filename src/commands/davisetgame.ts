import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION, BOT_GUILDS } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { setDefaultStreamGame } from '../modules/stream-info/stream-default-game.service';
import { getStreamInfoEmbed } from '../modules/stream-info/stream-info.discord';

const METADATA = COMMAND_METADATA.DAVI_SET_GAME;

export class DaviSetGameCommand extends Command {
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
              .setName('game')
              .setDescription('Default game name')
              .setRequired(true),
          )
          .addBooleanOption((option) =>
            option
              .setName('app')
              .setDescription('Also show this game in the activity Live tab')
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
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply }) => {
        const game = interaction.options.getString('game', true);
        const app = interaction.options.getBoolean('app') ?? false;
        const targetGuildId = BOT_GUILDS.PROD_ENV;

        await setDefaultStreamGame({
          client: this.container.client,
          gameName: game,
          guildId: targetGuildId,
          app,
        });

        return editReply({
          content: `Prod env default game updated to **${game}**.${app ? ' Also selected for the activity Live tab.' : ''}`,
          embeds: [await getStreamInfoEmbed(targetGuildId)],
        });
      },
    });
  }
}
