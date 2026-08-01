import { describe, expect, it } from 'vitest';
import { buildShowAllGameStatsEmbed } from '../../src/modules/boss-encounter-stats/game/game-encounter-stats.discord';
import { getEmbedFieldValue } from '../utils/discord-output';

describe('all-game boss stats output', () => {
  it('includes game names in the mixed boss ranking', () => {
    const embed = buildShowAllGameStatsEmbed({
      bosses: [
        { name: 'Boss B', gameName: 'Game B', deaths: 7 },
        { name: 'Boss A', gameName: 'Game A', deaths: 4 },
      ],
    });

    expect(getEmbedFieldValue(embed, 'Boss stats')).toBe(
      '1. Boss B (Game B) - 7 deaths\n2. Boss A (Game A) - 4 deaths',
    );
  });
});
