import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  BOT_GUILDS,
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
  resetStreamInfo,
} from '../modules/stream-info/stream-info.service';

export class DaviResetStreamInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'daviresetstreaminfo',
      description: 'Resets all overrides for prod env current/next stream.',
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
        guildIds: [...COMMAND_GUILDS.DAVI_RESET_STREAM_INFO],
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
          COMMAND_GUILDS.DAVI_RESET_STREAM_INFO,
        );

        if (!sourceGuildId) {
          return;
        }

        const targetGuildId = BOT_GUILDS.PROD_ENV;

        await withTimeout(resetStreamInfo(targetGuildId), COMMAND_TIMEOUT_MS);

        const streamInfo = await withTimeout(
          getStreamInfo(targetGuildId),
          COMMAND_TIMEOUT_MS,
        );
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          content: 'Prod env stream override reset.',
          embeds: [embed],
        });
      },
    });
  }
}
