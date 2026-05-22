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
import { getStreamInfoEmbed } from '../modules/stream-info/get-stream-info-embed';
import { resetStreamTitle } from '../modules/stream-info/stream-info.service';

export class DaviResetTitleCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'daviresettitle',
      description: 'Resets title override for prod env current/next stream.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName(this.name)
          .setDescription(this.description)
          .setDefaultMemberPermissions(ADMIN_COMMAND_PERMISSION),
      {
        guildIds: [...COMMAND_GUILDS.DAVI_RESET_TITLE],
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
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.DAVI_RESET_TITLE),
      run: async ({ editReply }) => {
        const targetGuildId = BOT_GUILDS.PROD_ENV;

        await resetStreamTitle(targetGuildId);

        return editReply({
          content: 'Prod env title reset.',
          embeds: [await getStreamInfoEmbed(targetGuildId)],
        });
      },
    });
  }
}
