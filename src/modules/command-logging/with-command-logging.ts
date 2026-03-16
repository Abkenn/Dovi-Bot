import type { ChatInputCommandInteraction } from 'discord.js';
import {
  createCommandErrorLog,
  createCommandExecutionLog,
} from './command-logging.service';

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

    throw error;
  }
};
