import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import {
  getStreamInfo,
  resetStreamTitle,
} from '../modules/stream-info/stream-info.service';

export class ResetTitleCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'resettitle',
      description: 'Resets custom title override for current/next stream.',
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
        guildIds: [...COMMAND_GUILDS.RESET_TITLE],
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
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.RESET_TITLE),
      run: async ({ editReply, preflight: guildId }) => {
        await resetStreamTitle(guildId);

        const streamInfo = await getStreamInfo(guildId);
        const embed = buildStreamInfoEmbed(streamInfo);

        return editReply({
          content: 'Title override reset.',
          embeds: [embed],
        });
      },
    });
  }
}
