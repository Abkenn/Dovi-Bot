import { describe, expect, it } from 'vitest';
import {
  buildShowAllGameStatsEmbed,
  buildShowAllGameStatsPageMessage,
  buildShowGameStatsEmbed,
  parseAllGameStatsPageAction,
} from '../../src/modules/boss-encounter-stats/game/game-encounter-stats.discord';
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

  it('builds ten-row pages with correct disabled navigation states', () => {
    const ranking = {
      bosses: Array.from({ length: 21 }, (_, index) => ({
        name: `Long Boss Name ${index + 1}`,
        gameName: `Long Game Name ${index + 1}`,
        deaths: 200 - index,
      })),
    };
    const firstPage = buildShowAllGameStatsPageMessage({
      ranking,
      page: 1,
      requesterUserId: 'user-1',
    });
    const lastPage = buildShowAllGameStatsPageMessage({
      ranking,
      page: 3,
      requesterUserId: 'user-1',
    });
    const firstButtons = JSON.stringify(firstPage.components?.at(-1));
    const lastButtons = JSON.stringify(lastPage.components?.at(-1));

    expect(JSON.stringify(firstPage.components)).toContain('Page 1 of 3');
    expect(firstButtons).toContain(
      '"label":"Previous","style":2,"disabled":true',
    );
    expect(firstButtons).toContain('"label":"Next","style":2,"disabled":false');
    expect(JSON.stringify(lastPage.components)).toContain(
      '21. Long Boss Name 21 (Long Game Name 21) - 180 deaths',
    );
    expect(lastButtons).toContain(
      '"label":"Previous","style":2,"disabled":false',
    );
    expect(lastButtons).toContain('"label":"Next","style":2,"disabled":true');
  });

  it('parses all-game pagination actions', () => {
    expect(parseAllGameStatsPageAction('all-game-stats:user-1:2')).toEqual({
      requesterUserId: 'user-1',
      page: 2,
    });
    expect(parseAllGameStatsPageAction('other:user-1:2')).toBeNull();
    expect(parseAllGameStatsPageAction('all-game-stats::2')).toBeNull();
    expect(parseAllGameStatsPageAction('all-game-stats:user-1:0')).toBeNull();
    expect(
      parseAllGameStatsPageAction('all-game-stats:user-1:nope'),
    ).toBeNull();
  });

  it('shows an empty state for a game without boss stats', () => {
    const embed = buildShowGameStatsEmbed({
      game: { id: 'game-1', name: 'No Stats Game' },
      stats: [],
      trackedBosses: [],
    });

    expect(getEmbedFieldValue(embed, 'Boss stats')).toBe(
      'No boss stats found for this game yet.',
    );
  });

  it('splits boss stats across embed fields at Discord limits', () => {
    const longName = 'Very Long Boss Name '.repeat(35);
    const embed = buildShowAllGameStatsEmbed({
      bosses: Array.from({ length: 3 }, (_, index) => ({
        name: `${longName}${index}`,
        gameName: 'Long Game',
        deaths: 10 - index,
      })),
    });

    expect(embed.toJSON().fields?.map((field) => field.name)).toContain(
      'Boss stats continued',
    );
  });
});
