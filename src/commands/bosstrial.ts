import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { assertCommandAccess } from '../config/discord-command-guards';
import { COMMAND_METADATA } from '../config/discord-command-metadata';
import { BOSS_TRIAL_DURATION_OPTIONS } from '../modules/boss-trials/boss-trial.config';
import {
  buildBossTrialPollMessage,
  buildBossTrialRequesterControls,
} from '../modules/boss-trials/poll/boss-trial.discord';
import {
  attachBossTrialMessage,
  createBossTrial,
} from '../modules/boss-trials/poll/boss-trial.service';
import { runCommand } from '../modules/command-runner/run-command';

const METADATA = COMMAND_METADATA.BOSS_TRIAL;

export class BossTrialCommand extends Command {
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
              .setName('game')
              .setDescription('Game name')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('boss')
              .setDescription('Boss name')
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName('duration')
              .setDescription('How long until the scheduled result is posted')
              .setRequired(false)
              .addChoices(
                {
                  name: BOSS_TRIAL_DURATION_OPTIONS.ONE_HOUR.label,
                  value: BOSS_TRIAL_DURATION_OPTIONS.ONE_HOUR.value,
                },
                {
                  name: BOSS_TRIAL_DURATION_OPTIONS.ONE_DAY.label,
                  value: BOSS_TRIAL_DURATION_OPTIONS.ONE_DAY.value,
                },
              ),
          )
          .addStringOption((option) =>
            option
              .setName('bump')
              .setDescription('Automatic bump behavior')
              .setRequired(false)
              .setAutocomplete(true),
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
      beforeDefer: () => assertCommandAccess(interaction, METADATA),
      run: async ({ editReply, preflight: guildId }) => {
        const channelId = interaction.channelId;
        const gameName = interaction.options.getString('game', true);
        const bossName = interaction.options.getString('boss', true);
        const duration = interaction.options.getString('duration');
        const bump = interaction.options.getString('bump');
        const trial = await createBossTrial({
          guildId,
          channelId,
          requesterUserId: interaction.user.id,
          gameName,
          bossName,
          duration,
          bump,
        });

        const message = await editReply({
          componentMessage: buildBossTrialPollMessage(trial),
        });

        if (message) {
          await attachBossTrialMessage({
            trialId: trial.id,
            messageId: message.id,
          });
        }

        await interaction.followUp({
          content: 'Your boss trial judge controls.',
          components: [buildBossTrialRequesterControls(trial.id)],
          flags: MessageFlags.Ephemeral,
        });

        return message;
      },
    });
  }
}
