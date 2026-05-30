import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { importCommunityTopicSeed } from '../src/data/transactions/boss-topic-info';
import { BossTopicTermKind } from '../src/generated/prisma/enums';
import { prisma } from '../src/lib/prisma';
import type { CommunityTopicSeed } from '../src/modules/community-topics/community-topic.types';
import { toCommunityTopicEntityKey } from '../src/modules/community-topics/community-topic-matcher';

const SEED_PATH = 'data/boss-discussion-aliases.seed.json';

type SeedTerm = {
  kind: BossTopicTermKind;
  value: string;
  normalizedValue: string;
};

const toTerm = (kind: BossTopicTermKind, value: string): SeedTerm | null => {
  const cleanValue = value.trim();
  const normalizedValue = toCommunityTopicEntityKey(cleanValue);

  if (!cleanValue || !normalizedValue) {
    return null;
  }

  return { kind, value: cleanValue, normalizedValue };
};

const buildTerms = (
  valuesByKind: Record<BossTopicTermKind, string[]>,
): SeedTerm[] => {
  const seen = new Set<string>();

  return Object.entries(valuesByKind)
    .flatMap(([kind, values]) =>
      values.map((value) => toTerm(kind as BossTopicTermKind, value)),
    )
    .filter((term): term is SeedTerm => term !== null)
    .filter((term) => {
      const key = `${term.kind}:${term.normalizedValue}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const loadSeed = async () => {
  const raw = await readFile(resolve(SEED_PATH), 'utf8');
  const seed = JSON.parse(raw.replace(/^\uFEFF/, '')) as CommunityTopicSeed;

  if (!Array.isArray(seed.games) || !Array.isArray(seed.bosses)) {
    throw new Error('Community topic seed must include games[] and bosses[].');
  }

  return seed;
};

const seed = await loadSeed();
const result = await importCommunityTopicSeed({
  games: seed.games.map((game) => ({
    name: game.canonicalName,
    normalizedName: toCommunityTopicEntityKey(game.canonicalName),
    topicTerms: buildTerms({
      [BossTopicTermKind.ALIAS]: [game.canonicalName, ...game.aliases],
      [BossTopicTermKind.WEAK_ALIAS]: [],
      [BossTopicTermKind.CONTEXT]: [],
    }),
  })),
  bosses: seed.bosses.map((boss) => ({
    gameName: boss.game,
    normalizedGameName: toCommunityTopicEntityKey(boss.game),
    name: boss.canonicalName,
    normalizedName: toCommunityTopicEntityKey(boss.canonicalName),
    topicTerms: buildTerms({
      [BossTopicTermKind.ALIAS]: [boss.canonicalName, ...boss.aliases],
      [BossTopicTermKind.WEAK_ALIAS]: boss.weakAliases,
      [BossTopicTermKind.CONTEXT]: boss.contextWords,
    }),
  })),
});

console.log(
  `Imported ${result.gameCount} games, ${result.bossCount} bosses, and ${result.topicTermCount} topic terms.`,
);

await prisma.$disconnect();
