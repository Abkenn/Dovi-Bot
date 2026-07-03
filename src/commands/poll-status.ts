import { Command } from '@sapphire/framework';
import { InteractionContextType } from 'discord.js';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { CommandDeniedError } from '../modules/command-logging/command-denied';
import { runCommand } from '../modules/command-runner/run-command';
import { getAccessiblePollTournaments } from '../modules/poll-tournaments/poll-tournament.service';
import { buildPollTournamentStatusPages } from '../modules/poll-tournaments/poll-tournament-status.discord';

const METADATA = COMMAND_METADATA.POLL_STATUS;

const assertDirectMessage = (guildId: string | null) => {
  if (guildId) {
    throw new CommandDeniedError(
      'Use this command in my DMs only if you have hosted a poll.',
    );
  }
};

export class PollStatusCommand extends Command {
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
        .setContexts(InteractionContextType.BotDM),
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
        const pages = buildPollTournamentStatusPages(
          await getAccessiblePollTournaments(interaction.user.id),
        );
        const response = await editReply({
          content: pages[0] ?? 'You have no active hosted polls.',
        });

        for (const page of pages.slice(1)) {
          await interaction.followUp({ content: page });
        }

        return response;
      },
    });
  }
}
