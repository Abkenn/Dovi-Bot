import { Command } from '@sapphire/framework';
import { assertCommandGuildAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { updateLiveBossInfo } from '../modules/boss-tracking/boss-tracking.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.UPDATE_BOSS_INFO;

export class UpdateBossInfoCommand extends Command {
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
              .setName('boss')
              .setDescription('Boss to update, defaults to latest tracked boss')
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Display name for the boss')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('aliases')
              .setDescription('Names people type for the boss, comma-separated')
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('tags')
              .setDescription(
                'Context words like area/game shorthand, comma-separated',
              )
              .setRequired(false),
          )
          .addStringOption((option) =>
            option
              .setName('game')
              .setDescription('Game name, defaults to the stream game')
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('weak_aliases')
              .setDescription('Advanced: ambiguous names that need tag context')
              .setRequired(false),
          )
          .addIntegerOption((option) =>
            option
              .setName('runback_seconds')
              .setDescription('Approx runback seconds after each death')
              .setRequired(false)
              .setMinValue(0),
          )
          .addIntegerOption((option) =>
            option
              .setName('next_runback_seconds')
              .setDescription('Runback seconds only for the current attempt')
              .setRequired(false)
              .setMinValue(0),
          ),
      {
        guildIds: [...METADATA.guildIds],
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    return runCommand({
      interaction,
      commandName: this.name,
      beforeDefer: () =>
        assertCommandGuildAccess(interaction, METADATA.guildIds),
      run: async ({ editReply, preflight: guildId }) => {
        const result = await updateLiveBossInfo({
          guildId,
          userId: interaction.user.id,
          gameName: interaction.options.getString('game'),
          bossName: interaction.options.getString('boss'),
          name: interaction.options.getString('name'),
          aliases: interaction.options.getString('aliases'),
          weakAliases: interaction.options.getString('weak_aliases'),
          contextWords: interaction.options.getString('tags'),
          runbackSeconds: interaction.options.getInteger('runback_seconds'),
          nextRunbackSeconds: interaction.options.getInteger(
            'next_runback_seconds',
          ),
        });

        return editReply({
          content: [
            result.updatedName
              ? `Updated boss name to **${result.bossName}**.`
              : `Updated **${result.gameName} - ${result.bossName}**.`,
            result.addedCount > 0
              ? `Added ${result.addedCount} topic term${result.addedCount === 1 ? '' : 's'}.`
              : null,
            result.updatedRunbackSeconds
              ? `Set runback to ${result.runbackSeconds ?? 0}s.`
              : null,
            result.updatedNextRunbackSeconds
              ? `Set next runback to ${result.nextRunbackSeconds ?? 0}s.`
              : null,
          ]
            .filter(Boolean)
            .join(' '),
        });
      },
    });
  }
}
