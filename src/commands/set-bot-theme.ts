import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { getSeasonalTheme, SEASONAL_THEMES } from '../config/seasonal-themes';
import { CommandDeniedError } from '../modules/command-logging/command-denied';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import {
  getBotThemeMode,
  setBotThemeMode,
} from '../modules/command-runner/seasonal-theme.service';

const METADATA = COMMAND_METADATA.SET_BOT_THEME;

export class SetBotThemeCommand extends Command {
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
          .setDefaultMemberPermissions(ADMIN_COMMAND_PERMISSION)
          .addStringOption((option) =>
            option
              .setName('mode')
              .setDescription(
                'Omit to inspect the current setting. Applies to staging and production.',
              )
              .addChoices(
                { name: 'Auto (seasonal schedule)', value: 'auto' },
                { name: 'Normal (seasonal themes off)', value: 'normal' },
                ...Object.entries(SEASONAL_THEMES)
                  .filter(([, theme]) => theme !== null)
                  .map(([name]) => ({ name, value: name })),
              ),
          ),
      { guildIds: [...METADATA.guildIds] },
    );
  }

  public override chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      deferReplyOptions: EPHEMERAL_COMMAND_REPLY,
      beforeDefer: async () => {
        await assertCommandAccess(interaction, METADATA);
        if (!interaction.memberPermissions?.has(ADMIN_COMMAND_PERMISSION))
          throw new CommandDeniedError(
            'You need Manage Server to change the bot theme.',
          );
      },
      run: async ({ editReply }) => {
        const previous = await getBotThemeMode();
        const mode = interaction.options.getString('mode') ?? previous;
        if (mode !== previous) await setBotThemeMode(mode);
        const theme = getSeasonalTheme(mode);
        const lines = [
          `Bot theme: **${mode}**. Active appearance: **${theme?.id ?? 'normal'}**. Applies to staging and production.`,
        ];
        if (mode !== previous)
          lines.push(`To undo: \`/set-bot-theme mode:${previous}\`.`);
        return editReply({ content: lines.join('\n') });
      },
    });
  }
}
