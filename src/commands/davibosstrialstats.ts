import { Command } from '@sapphire/framework';
import { BOT_GUILDS } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { buildBossTrialStatsEmbed } from '../modules/boss-trials/stats/boss-trial-stats.discord';
import { getBossTrialStats } from '../modules/boss-trials/stats/boss-trial-stats.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.DAVI_BOSS_TRIAL_STATS;

export class DaviBossTrialStatsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
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
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply }) => {
        const stats = await getBossTrialStats(BOT_GUILDS.PROD_ENV);

        return editReply({
          embeds: [
            buildBossTrialStatsEmbed({
              stats,
              title: 'Prod Boss Trial Stats',
            }),
          ],
        });
      },
    });
  }
}
