import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { POLL_TOURNAMENT_CONFIG } from '../modules/poll-tournaments/poll-tournament.config';
import { refreshPollTournamentHostMessage } from '../modules/poll-tournaments/poll-tournament.lifecycle';
import { nominatePollTournament } from '../modules/poll-tournaments/poll-tournament.service';

const METADATA = COMMAND_METADATA.POLL_NOMINATE;

export class PollNominateCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => {
        builder
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option
              .setName('poll')
              .setDescription('Poll accepting nominations')
              .setRequired(true)
              .setAutocomplete(true),
          );

        for (let index = 1; index <= 3; index += 1) {
          builder.addStringOption((option) =>
            option
              .setName(`option${index}`)
              .setDescription(`Nomination ${index}`)
              .setRequired(index === 1)
              .setMaxLength(POLL_TOURNAMENT_CONFIG.maxOptionLength),
          );
        }

        return builder;
      },
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
      withCommandLogging: false,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        const tournamentId = interaction.options.getString('poll', true);
        const result = await nominatePollTournament({
          guildId,
          tournamentId,
          nominatorUserId: interaction.user.id,
          optionInputs: [
            interaction.options.getString('option1'),
            interaction.options.getString('option2'),
            interaction.options.getString('option3'),
          ],
        });
        const response = await editReply({
          content: `Nominations saved. You have used ${result.usedCount}/${result.maxNominationsPerUser} nominations for this poll.`,
        });

        await refreshPollTournamentHostMessage(
          interaction.client,
          tournamentId,
        ).catch((error) => {
          this.container.logger.error(
            `Failed to refresh poll host message ${tournamentId}.`,
            error,
          );
        });

        return response;
      },
    });
  }
}
