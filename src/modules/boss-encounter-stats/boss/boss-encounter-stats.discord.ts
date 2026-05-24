import { EmbedBuilder } from 'discord.js';
import { addDaviBossStatsField } from '../../bosses/bosses.discord';
import type { BossView } from '../../bosses/bosses.service';

export const buildShowBossStatsEmbed = (boss: BossView) =>
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
