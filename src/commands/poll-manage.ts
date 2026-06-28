import { Command } from '@sapphire/framework';
import { InteractionContextType } from 'discord.js';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { CommandDeniedError } from '../modules/command-logging/command-denied';
import { runCommand } from '../modules/command-runner/run-command';
import { refreshPollTournamentHostMessage } from '../modules/poll-tournaments/poll-tournament.lifecycle';
import { managePollTournament } from '../modules/poll-tournaments/poll-tournament.service';

const METADATA = COMMAND_METADATA.POLL_MANAGE;

const assertDirectMessage = (guildId: string | null) => {
  if (guildId) {
    throw new CommandDeniedError(
      'Use this command in my DMs only if you have hosted a poll.',
    );
  }
};

export class PollManageCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: METADATA.name,
      description: METADATA.description,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setContexts(InteractionContextType.BotDM)
        .addStringOption((option) =>
          option
            .setName('poll')
            .setDescription('Poll to manage')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName('remove')
            .setDescription('Nomination to remove')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      beforeDefer: () => assertDirectMessage(interaction.guildId),
      run: async ({ editReply }) => {
        const result = await managePollTournament({
          tournamentId: interaction.options.getString('poll', true),
          normalizedOption: interaction.options.getString('remove', true),
          userId: interaction.user.id,
        });
        await refreshPollTournamentHostMessage(
          interaction.client,
          result.tournament.id,
        );

        return editReply({
          content: `Removed **${result.removedOption}** from **${result.tournament.title}**.`,
          allowedMentions: { parse: [] },
        });
      },
    });
  }
}
