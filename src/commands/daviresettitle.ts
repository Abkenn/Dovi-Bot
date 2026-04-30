import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import {
  ADMIN_COMMAND_PERMISSION,
  BOT_GUILDS,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';
import { buildStreamInfoEmbed } from '../modules/stream-info/stream-info.embed';
import {
  getStreamInfo,
  resetStreamTitle,
} from '../modules/stream-info/stream-info.service';

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
      run: async () => {
        const sourceGuildId = await assertCommandGuildAccess(
          interaction,
          COMMAND_GUILDS.DAVI_RESET_TITLE,
        );

        if (!sourceGuildId) {
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetGuildId = BOT_GUILDS.PROD_ENV;

        await resetStreamTitle(targetGuildId);

        const streamInfo = await getStreamInfo(targetGuildId);
        const embed = buildStreamInfoEmbed(streamInfo);

        return interaction.editReply({
          content: 'Prod env title reset.',
          embeds: [embed],
        });
      },
    });
  }
}
