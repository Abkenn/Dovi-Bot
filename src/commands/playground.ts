import { Command } from '@sapphire/framework';
import { ADMIN_COMMAND_PERMISSION, BOT_GUILDS } from '../config/discord-access';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { CommandDeniedError } from '../modules/command-logging/command-denied';
import {
  EPHEMERAL_COMMAND_REPLY,
  runCommand,
} from '../modules/command-runner/run-command';
import { registerComponentLifetime } from '../modules/discord/component-lifecycle';
import { getTrackedActivityInstances } from '../modules/embedded-app/activity-tracking.service';
import {
  buildActivityTrackingReport,
  buildPlaygroundShowcase,
} from '../modules/playground/playground.discord';

const METADATA = COMMAND_METADATA.PLAYGROUND;

export class PlaygroundCommand extends Command {
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
          .addSubcommand((subcommand) =>
            subcommand
              .setName('modal')
              .setDescription(
                'Try radio buttons and checkboxes in a demo modal.',
              ),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('activity')
              .setDescription('Inspect sampled Activity presence.')
              .addStringOption((option) =>
                option
                  .setName('environment')
                  .setDescription(
                    'Environment to inspect (defaults to staging).',
                  )
                  .addChoices(
                    { name: 'Staging', value: 'staging' },
                    { name: 'Production', value: 'prod' },
                  ),
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
            'You need Manage Server to use the playground.',
          );
      },
      run: async ({ editReply }) => {
        if (interaction.options.getSubcommand() === 'modal') {
          const expiresAt = Date.now() + 10 * 60_000;
          registerComponentLifetime(
            `playground:open:${interaction.user.id}:${expiresAt}`,
            expiresAt,
          );
          return editReply(
            buildPlaygroundShowcase(interaction.user.id, expiresAt),
          );
        }
        const guildId =
          interaction.options.getString('environment') === 'prod'
            ? BOT_GUILDS.PROD_ENV
            : BOT_GUILDS.STAGING_ENV;
        return editReply({
          content: buildActivityTrackingReport(
            getTrackedActivityInstances(guildId),
          ),
          allowedMentions: { parse: [] },
        });
      },
    });
  }
}
