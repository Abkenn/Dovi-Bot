import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COMMUNITY_TOPIC_KINDS,
  type CommunityTopicMatch,
  type CommunityTopicSeed,
  type CommunityTopicSeedBoss,
  type CommunityTopicSeedGame,
} from './community-topic.types';

const DEFAULT_SEED_PATH = 'data/boss-discussion-aliases.seed.json';
const GENERIC_WEAK_ALIAS_TERMS = new Set([
  'angel',
  'ape',
  'beast',
  'bull',
  'captain',
  'champion',
  'chef',
  'clown',
  'commander',
  'devil',
  'dragonlord',
  'elite',
  'father',
  'giant',
  'great',
  'guardian',
  'hunter',
  'inquisitor',
  'king',
  'knight',
  'lady',
  'lion',
  'master',
  'monk',
  'monster',
  'owl',
  'robot',
  'spirit',
  'warrior',
  'witch',
  'witches',
]);

type MatchTerm = {
  raw: string;
  normalized: string;
};

type GameIndex = CommunityTopicSeedGame & {
  aliasTerms: MatchTerm[];
};

type BossIndex = CommunityTopicSeedBoss & {
  aliasTerms: MatchTerm[];
  weakAliasTerms: MatchTerm[];
  contextTerms: MatchTerm[];
};

type CommunityTopicMatcher = {
  seed: CommunityTopicSeed;
  matchContent: (content: string) => CommunityTopicMatch[];
  getContentHash: (content: string) => string;
};

let cachedMatcher: CommunityTopicMatcher | null = null;

const normalizeForMatch = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const toCommunityTopicEntityKey = (value: string) =>
  normalizeForMatch(value);

const toMatchTerm = (value: string): MatchTerm | null => {
  const normalized = normalizeForMatch(value);

  if (!normalized) {
    return null;
  }

  return {
    raw: value,
    normalized,
  };
};

const buildTerms = (values: string[]) =>
  values
    .map(toMatchTerm)
    .filter((term): term is MatchTerm => term !== null)
    .filter(
      (term, index, terms) =>
        terms.findIndex(
          (otherTerm) => otherTerm.normalized === term.normalized,
        ) === index,
    );

const loadSeed = (path: string): CommunityTopicSeed => {
  const raw = readFileSync(resolve(path), 'utf8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(raw) as CommunityTopicSeed;

  if (!Array.isArray(parsed.games) || !Array.isArray(parsed.bosses)) {
    throw new Error('Community topic seed must include games[] and bosses[].');
  }

  return parsed;
};

const buildGameIndex = (games: CommunityTopicSeedGame[]): GameIndex[] =>
  games.map((game) => ({
    ...game,
    aliasTerms: buildTerms([game.canonicalName, ...game.aliases]),
  }));

const buildBossIndex = (bosses: CommunityTopicSeedBoss[]): BossIndex[] =>
  bosses.map((boss) => ({
    ...boss,
    aliasTerms: buildTerms([boss.canonicalName, ...boss.aliases]),
    weakAliasTerms: buildTerms(boss.weakAliases),
    contextTerms: buildTerms([boss.game, ...boss.contextWords]),
  }));

const countTerm = (normalizedContent: string, normalizedTerm: string) => {
  const haystack = ` ${normalizedContent} `;
  const needle = ` ${normalizedTerm} `;
  let count = 0;
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }

  return count;
};

const getMatchedTerms = (normalizedContent: string, terms: MatchTerm[]) =>
  terms
    .map((term) => ({
      raw: term.raw,
      count: countTerm(normalizedContent, term.normalized),
    }))
    .filter((match) => match.count > 0);

const roundScore = (value: number) => Math.round(value * 100) / 100;

const createMatcher = (seedPath = DEFAULT_SEED_PATH): CommunityTopicMatcher => {
  const seed = loadSeed(seedPath);
  const games = buildGameIndex(seed.games);
  const bosses = buildBossIndex(seed.bosses);
  const gameAliasTermsByName = new Map(
    games.map((game) => [
      game.canonicalName,
      new Set(game.aliasTerms.map((term) => term.normalized)),
    ]),
  );

  const matchContent = (content: string): CommunityTopicMatch[] => {
    const normalizedContent = normalizeForMatch(content);

    if (!normalizedContent) {
      return [];
    }

    const gameMatches = games.flatMap((game) => {
      const matchedAliases = getMatchedTerms(
        normalizedContent,
        game.aliasTerms,
      );

      if (matchedAliases.length === 0) {
        return [];
      }

      const hitCount = matchedAliases.reduce(
        (sum, match) => sum + match.count,
        0,
      );

      return [
        {
          topicKind: COMMUNITY_TOPIC_KINDS.GAME,
          entityKey: toCommunityTopicEntityKey(game.canonicalName),
          entityName: game.canonicalName,
          gameName: null,
          matchedAliases: matchedAliases.map((match) => match.raw),
          matchedWeakAliases: [],
          contextWords: [],
          confidence: roundScore(Math.min(0.95, 0.65 + hitCount * 0.08)),
          intensity: roundScore(Math.min(3, 1 + (hitCount - 1) * 0.35)),
        },
      ];
    });

    const mentionedGames = new Set(
      gameMatches.map((gameMatch) => gameMatch.entityName),
    );
    const bossMatches = bosses.flatMap((boss) => {
      const matchedAliases = getMatchedTerms(
        normalizedContent,
        boss.aliasTerms,
      );
      const matchedWeakAliases = getMatchedTerms(
        normalizedContent,
        boss.weakAliasTerms,
      ).filter((match) => {
        const normalizedMatch = normalizeForMatch(match.raw);
        const gameAliasTerms = gameAliasTermsByName.get(boss.game);

        if (GENERIC_WEAK_ALIAS_TERMS.has(normalizedMatch)) {
          return false;
        }

        return !gameAliasTerms?.has(normalizedMatch);
      });
      const matchedContextWords = getMatchedTerms(
        normalizedContent,
        boss.contextTerms,
      );
      const hasGameContext = mentionedGames.has(boss.game);
      const hasContext = hasGameContext || matchedContextWords.length > 0;

      if (matchedAliases.length === 0 && !hasContext) {
        return [];
      }

      if (matchedAliases.length === 0 && matchedWeakAliases.length === 0) {
        return [];
      }

      const aliasHitCount = matchedAliases.reduce(
        (sum, match) => sum + match.count,
        0,
      );
      const weakHitCount = matchedWeakAliases.reduce(
        (sum, match) => sum + match.count,
        0,
      );
      const contextHitCount = matchedContextWords.reduce(
        (sum, match) => sum + match.count,
        0,
      );
      const baseConfidence =
        matchedAliases.length > 0
          ? 0.58 + aliasHitCount * 0.12
          : 0.34 + weakHitCount * 0.1;

      return [
        {
          topicKind: COMMUNITY_TOPIC_KINDS.BOSS,
          entityKey: `${toCommunityTopicEntityKey(boss.game)}:${toCommunityTopicEntityKey(
            boss.canonicalName,
          )}`,
          entityName: boss.canonicalName,
          gameName: boss.game,
          matchedAliases: matchedAliases.map((match) => match.raw),
          matchedWeakAliases: matchedWeakAliases.map((match) => match.raw),
          contextWords: matchedContextWords.map((match) => match.raw),
          confidence: roundScore(
            Math.min(
              0.98,
              baseConfidence +
                (hasGameContext ? 0.12 : 0) +
                Math.min(0.18, contextHitCount * 0.04),
            ),
          ),
          intensity: roundScore(
            Math.min(
              3,
              1 +
                Math.max(0, aliasHitCount + weakHitCount - 1) * 0.35 +
                Math.min(0.4, contextHitCount * 0.08),
            ),
          ),
        },
      ];
    });

    return [...gameMatches, ...bossMatches];
  };

  return {
    seed,
    matchContent,
    getContentHash: (content) =>
      createHash('sha256').update(content).digest('hex'),
  };
};

export const getCommunityTopicMatcher = () => {
  cachedMatcher ??= createMatcher();

  return cachedMatcher;
};
