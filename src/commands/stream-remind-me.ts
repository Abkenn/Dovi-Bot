import { Command } from '@sapphire/framework';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { setPermanentStreamReminder } from '../modules/stream-info/stream-reminder.service';

const METADATA = COMMAND_METADATA.STREAM_REMIND_ME;

export class StreamRemindMeCommand extends Command {
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
              .setName('permanent')
              .setDescription('Remind you about all future streams')
              .addChoices(
                { name: 'Yes', value: 'yes' },
                { name: 'No', value: 'no' },
              )
              .setRequired(false),
          ),
      { guildIds: [...METADATA.guildIds] },
    );
  }

  public override chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const enabled = interaction.options.getString('permanent') !== 'no';

    return runCommand({
      interaction,
      commandName: this.name,
      deferReplyOptions: EPHEMERAL_COMMAND_REPLY,
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        await setPermanentStreamReminder({
          enabled,
          guildId,
          userId: interaction.user.id,
        });

        return editReply({
          content: enabled
            ? 'Permanent stream reminders are on. I’ll DM you for future streams.'
            : 'Permanent stream reminders are off.',
        });
      },
    });
  }
}
