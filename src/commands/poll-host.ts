import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { runCommand } from '../modules/command-runner/run-command';
import { POLL_TOURNAMENT_CONFIG } from '../modules/poll-tournaments/poll-tournament.config';
import { buildPollTournamentHostMessage } from '../modules/poll-tournaments/poll-tournament.discord';
import {
  attachHostedPollTournamentMessage,
  hostPollTournament,
} from '../modules/poll-tournaments/poll-tournament.service';

const METADATA = COMMAND_METADATA.POLL_HOST;

export class PollHostCommand extends Command {
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
              .setName('title')
              .setDescription('What this tournament is deciding')
              .setRequired(true)
              .setMaxLength(POLL_TOURNAMENT_CONFIG.maxTitleLength),
          )
          .addIntegerOption((option) =>
            option
              .setName('nominations_per_person')
              .setDescription('Per-person limit, defaults to 3')
              .setMinValue(1)
              .setMaxValue(POLL_TOURNAMENT_CONFIG.maxNominationsPerUser),
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
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        const tournament = await hostPollTournament({
          guildId,
          hostUserId: interaction.user.id,
          hostChannelId: interaction.channelId,
          title: interaction.options.getString('title', true),
          maxNominationsPerUser:
            interaction.options.getInteger('nominations_per_person') ??
            POLL_TOURNAMENT_CONFIG.defaultNominationsPerUser,
        });
        const message = await editReply(
          buildPollTournamentHostMessage({
            title: tournament.title,
            uniqueCount: 0,
            nominatorCount: 0,
            maxNominationsPerUser: tournament.maxNominationsPerUser,
          }),
        );

        if (message) {
          await attachHostedPollTournamentMessage({
            tournamentId: tournament.id,
            hostMessageId: message.id,
          });
        }

        return message;
      },
    });
  }
}
