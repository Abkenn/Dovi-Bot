import { type ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { ZodError } from 'zod';
import {
  createCommandErrorLog,
  createCommandExecutionLog,
} from './command-logging.service';

const getUserFacingErrorMessage = (error: unknown): string => {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return firstIssue?.message ?? 'Invalid command input.';
  }

  if (error instanceof Error) {
    return error.message || 'Something went wrong while running the command.';
  }

  return 'Something went wrong while running the command.';
};

export const withCommandLogging = async <T>({
  interaction,
  commandName,
  run,
}: {
  interaction: ChatInputCommandInteraction;
  commandName: string;
  run: () => Promise<T>;
}) => {
  const startedAt = Date.now();

  try {
    const result = await run();

    await createCommandExecutionLog({
      interaction,
      commandName,
      status: 'SUCCESS',
      durationMs: Date.now() - startedAt,
      note: 'Command executed successfully',
    });

    return result;
  } catch (error) {
    const note =
      error instanceof Error ? error.message : 'Unknown command error';

    const execution = await createCommandExecutionLog({
      interaction,
      commandName,
      status: 'ERROR',
      durationMs: Date.now() - startedAt,
      note,
    });

    await createCommandErrorLog({
      commandExecutionId: execution.id,
      error,
    });

    const message = getUserFacingErrorMessage(error);

    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply({
          content: `Error: ${message}`,
          embeds: [],
        });
      }

      return await interaction.reply({
        content: `Error: ${message}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      throw error;
    }
  }
};
