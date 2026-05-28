import { EmbedBuilder } from 'discord.js';
import {
  getCommandCategoryAccentColor,
  HELP_CATEGORIES,
} from '../../../config/discord-command-categories';
import { addDaviBossStatsField } from '../../bosses/bosses.discord';
import type { BossView } from '../../bosses/bosses.service';

export const buildShowBossStatsEmbed = (boss: BossView) =>
  addDaviBossStatsField(
    new EmbedBuilder()
      .setTitle('Boss Stats')
      .setColor(getCommandCategoryAccentColor(HELP_CATEGORIES.BOSSES))
      .addFields(
        { name: 'Game', value: boss.game.name, inline: true },
        { name: 'Boss', value: boss.name, inline: true },
      ),
    boss,
  );
