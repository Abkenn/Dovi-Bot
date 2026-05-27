import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION } from '../config/discord-access';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { syncDaviBossStats } from '../modules/boss-encounter-stats/sync/davi-boss-stats-sync.service';
import { formatDaviBossStatsSyncSummary } from '../modules/boss-encounter-stats/sync/davi-boss-stats-sync.utils';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.SYNC_DAVI_BOSS_STATS;

export class SyncBossStatsCommand extends Command {
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
          .setDefaultMemberPermissions(ADMIN_COMMAND_PERMISSION),
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
      timeoutMs: 60_000,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
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
