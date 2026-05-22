import { Command } from '@sapphire/framework';
import { BOT_GUILDS, COMMAND_GUILDS } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { buildBossTrialStatsEmbed } from '../modules/boss-stats/boss-trial-stats.discord';
import { getBossTrialStats } from '../modules/boss-stats/boss-trial-stats.service';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';

export class DaviBossTrialStatsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'davibosstrialstats',
      description: 'Shows prod env boss trial stats from staging.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
      {
        guildIds: [...COMMAND_GUILDS.DAVI_BOSS_TRIAL_STATS],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return withCommandLogging({
      interaction,
      commandName: this.name,
      beforeDefer: () =>
        assertCommandGuildAccess(
          interaction,
          COMMAND_GUILDS.DAVI_BOSS_TRIAL_STATS,
        ),
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
