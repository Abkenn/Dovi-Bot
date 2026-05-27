import { EmbedBuilder } from 'discord.js';
import { DISCORD_STYLE } from '../../../config/discord-style';
import { addDaviBossStatsField } from '../../bosses/bosses.discord';
import type { BossView } from '../../bosses/bosses.service';

export const buildShowBossStatsEmbed = (boss: BossView) =>
  addDaviBossStatsField(
    new EmbedBuilder()
      .setTitle('Boss Stats')
      .setColor(DISCORD_STYLE.BOT_ACCENT_COLOR)
      .addFields(
        { name: 'Game', value: boss.game.name, inline: true },
        { name: 'Boss', value: boss.name, inline: true },
      ),
    boss,
  );
