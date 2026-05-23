import { Command } from '@sapphire/framework';
import {
  ADMIN_COMMAND_PERMISSION,
  COMMAND_GUILDS,
} from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { syncDaviBossStats } from '../modules/boss-stats/sync/davi-boss-stats-sync.service';
import { formatDaviBossStatsSyncSummary } from '../modules/boss-stats/sync/davi-boss-stats-sync.utils';
import {
  EPHEMERAL_COMMAND_REPLY,
  withCommandLogging,
} from '../modules/command-logging/with-command-logging';

export class SyncBossStatsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'syncbossstats',
      description: 'Syncs Davi boss stats from the Abramo Docs.',
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
        guildIds: [...COMMAND_GUILDS.SYNC_DAVI_BOSS_STATS],
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
      timeoutMs: 60_000,
      beforeDefer: () =>
        assertCommandGuildAccess(
          interaction,
          COMMAND_GUILDS.SYNC_DAVI_BOSS_STATS,
        ),
      run: async ({ editReply, signal }) => {
        const result = await syncDaviBossStats({ signal });
        const invalidRows = result.invalidRows.slice(0, 5);
        const invalidRowSummary =
          invalidRows.length > 0 ? `\n${invalidRows.join('\n')}` : '';

        return editReply({
          content: `${formatDaviBossStatsSyncSummary(result)}${invalidRowSummary}`,
        });
      },
    });
  }
}
