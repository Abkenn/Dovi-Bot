import { EmbedBuilder } from 'discord.js';
import { addDaviBossStatsField } from '../boss-stats.discord';
import type { BossStatsBossView } from '../boss-stats.service';

export const buildShowBossStatsEmbed = (boss: BossStatsBossView) =>
  addDaviBossStatsField(
    new EmbedBuilder()
      .setTitle('Boss Stats')
      .setColor(0xff3131)
      .addFields(
        { name: 'Game', value: boss.game.name, inline: true },
        { name: 'Boss', value: boss.name, inline: true },
      ),
    boss,
  );
