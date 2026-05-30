import { EmbedBuilder } from 'discord.js';
import {
  COMMAND_CATEGORIES,
  getCommandCategoryAccentColor,
} from '../../../config/discord-command-categories';
import { addDaviBossStatsField } from '../../bosses/bosses.discord';
import type { BossView } from '../../bosses/bosses.service';

export const buildShowBossStatsEmbed = (boss: BossView) =>
  addDaviBossStatsField(
    new EmbedBuilder()
      .setTitle('Boss Stats')
      .setColor(getCommandCategoryAccentColor(COMMAND_CATEGORIES.BOSSES))
      .addFields(
        { name: 'Game', value: boss.game.name, inline: true },
        { name: 'Boss', value: boss.name, inline: true },
      ),
    boss,
  );
