import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { POLL_TOURNAMENT_CONFIG } from '../modules/poll-tournaments/poll-tournament.config';
import {
  postPollTournamentAnnouncement,
  runPollTournamentNow,
} from '../modules/poll-tournaments/poll-tournament.lifecycle';
import { startPollTournament } from '../modules/poll-tournaments/poll-tournament.service';

const METADATA = COMMAND_METADATA.POLL_START;

export class PollStartCommand extends Command {
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
          .addStringOption((option) =>
            option
              .setName('poll')
              .setDescription('One of your polls accepting nominations')
              .setRequired(true)
              .setAutocomplete(true),
          ),
      { guildIds: [...METADATA.guildIds] },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      deferReplyOptions: EPHEMERAL_COMMAND_REPLY,
      timeoutMs: 120_000,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply }) => {
        const result = await startPollTournament({
          tournamentId: interaction.options.getString('poll', true),
          hostUserId: interaction.user.id,
        });
        await postPollTournamentAnnouncement(
          interaction.client,
          result.tournament,
        );
        await runPollTournamentNow(interaction.client, result.tournament.id);
        return editReply({
          content: `Poll started in <#${POLL_TOURNAMENT_CONFIG.channelId}> with ${result.tournament.options.length} unique nominations. The first bracket is live.`,
        });
      },
    });
  }
}
