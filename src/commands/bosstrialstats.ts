import { Command } from '@sapphire/framework';
import { COMMAND_GUILDS } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { buildBossTrialStatsEmbed } from '../modules/boss-trials/stats/boss-trial-stats.discord';
import { getBossTrialStats } from '../modules/boss-trials/stats/boss-trial-stats.service';
import { withCommandLogging } from '../modules/command-logging/with-command-logging';

export class BossTrialStatsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'bosstrialstats',
      description: 'Shows boss trial history and leaderboards for this server.',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
      {
        guildIds: [...COMMAND_GUILDS.BOSS_TRIAL_STATS],
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
        assertCommandGuildAccess(interaction, COMMAND_GUILDS.BOSS_TRIAL_STATS),
      run: async ({ editReply, preflight: guildId }) => {
        const stats = await getBossTrialStats(guildId);

        return editReply({
          embeds: [
            buildBossTrialStatsEmbed({
              stats,
              title: 'Boss Trial Stats',
            }),
          ],
        });
      },
    });
  }
}
