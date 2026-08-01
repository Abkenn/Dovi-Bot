type DurableTopicTerm = {
  createdByUserId: string | null;
};

type DurableBossData = {
  topicTerms: DurableTopicTerm[];
  _count: {
    stats: number;
    trials: number;
    trackingSessions: number;
  };
};

type DurableGameData = {
  topicTerms: DurableTopicTerm[];
  defaultStreamGameConfig: unknown | null;
  _count: {
    bosses: number;
    trials: number;
    trackingSessions: number;
  };
};

const BOSS_IDENTITY_PUNCTUATION = new Set([
  '.',
  ',',
  '!',
  '?',
  ':',
  ';',
  "'",
  '"',
  '-',
  '_',
  '(',
  ')',
  '[',
  ']',
]);

export const normalizeBossIdentity = (value: string) => {
  let normalized = '';
  let needsSpace = false;

  for (const character of value.trim().toLowerCase()) {
    if (BOSS_IDENTITY_PUNCTUATION.has(character)) {
      continue;
    }

    if (!character.trim()) {
      needsSpace = normalized.length > 0;
      continue;
    }

    if (needsSpace) {
      normalized += ' ';
      needsSpace = false;
    }

    normalized += character;
  }

  return normalized;
};

const hasSystemOwnedTopicTerm = (topicTerms: DurableTopicTerm[]) =>
  topicTerms.some((term) => term.createdByUserId === null);

export const hasDurableBossData = (boss: DurableBossData) =>
  boss._count.stats > 0 ||
  boss._count.trials > 0 ||
  boss._count.trackingSessions > 0 ||
  hasSystemOwnedTopicTerm(boss.topicTerms);

export const hasDurableGameData = (game: DurableGameData) =>
  game._count.bosses > 0 ||
  game._count.trials > 0 ||
  game._count.trackingSessions > 0 ||
  hasSystemOwnedTopicTerm(game.topicTerms) ||
  game.defaultStreamGameConfig !== null;
