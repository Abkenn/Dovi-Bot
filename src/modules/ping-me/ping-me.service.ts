import { z } from 'zod';
import { BOT_GUILDS } from '../../config/discord-access';
import {
  deletePingMeProfile,
  findPingMeProfile,
  findPingMeProfilesForSources,
  upsertPingMeProfile,
} from '../../data/queries/ping-me';
import {
  cleanPingMeKeyword,
  doesPingMeKeywordMatch,
  getPingMeListeningSourceGuildIds,
  normalizePingMeKeywordKey,
} from './ping-me.matcher';
import type {
  PingMeClearKeywordAutocompleteInput,
  PingMeCommandInput,
  PingMeCommandResult,
  PingMeMessageInput,
  PingMeNotification,
} from './ping-me.types';

const MAX_KEYWORDS = 20;

const keywordSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(
    (keyword) => normalizePingMeKeywordKey(keyword).length >= 3,
    'Each keyword must contain at least 3 letters or numbers.',
  );

const keywordsSchema = z
  .array(keywordSchema)
  .min(1, 'Add at least one keyword.')
  .max(MAX_KEYWORDS, `You can track up to ${MAX_KEYWORDS} keywords.`)
  .superRefine((keywords, context) => {
    const seen = new Set<string>();

    for (const keyword of keywords) {
      const key = normalizePingMeKeywordKey(keyword);

      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate keyword: ${keyword}`,
        });
      }

      seen.add(key);
    }
  });

const commandInputSchema = z
  .object({
    clearKeyword: z.string().nullable(),
    newKeywordsInput: z.string().nullable(),
  })
  .refine(
    ({ clearKeyword, newKeywordsInput }) => !clearKeyword || !newKeywordsInput,
    {
      message: 'Choose either new_keywords or clear, not both.',
    },
  );

const guildBoundary = {
  stagingGuildId: BOT_GUILDS.STAGING_ENV,
  prodGuildId: BOT_GUILDS.PROD_ENV,
};

export const parsePingMeKeywords = (input: string): string[] =>
  keywordsSchema.parse(
    input.split(',').map(cleanPingMeKeyword).filter(Boolean),
  );

const formatScope = (sourceGuildId: string) =>
  sourceGuildId === BOT_GUILDS.STAGING_ENV
    ? 'this server and the production server'
    : 'this server only';

const formatKeywords = (keywords: string[]) =>
  keywords
    .map(
      (keyword) => String.fromCharCode(96) + keyword + String.fromCharCode(96),
    )
    .join(', ');

const findKeyword = (keywords: string[], requestedKeyword: string) => {
  const requestedKey = normalizePingMeKeywordKey(requestedKeyword);

  return keywords.find(
    (keyword) => normalizePingMeKeywordKey(keyword) === requestedKey,
  );
};

export const getPingMeClearKeywordAutocomplete = async ({
  userId,
  sourceGuildId,
  query,
}: PingMeClearKeywordAutocompleteInput): Promise<string[]> => {
  const profile = await findPingMeProfile({ userId, sourceGuildId });

  if (!profile) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();

  return profile.keywords
    .filter(
      (keyword) =>
        !normalizedQuery || keyword.toLowerCase().includes(normalizedQuery),
    )
    .slice(0, 25);
};

const getProfileKeywords = async (userId: string, sourceGuildId: string) => {
  const profile = await findPingMeProfile({ userId, sourceGuildId });

  return profile?.keywords ?? [];
};

const removePingMeKeyword = async (
  userId: string,
  sourceGuildId: string,
  clearKeyword: string,
): Promise<PingMeCommandResult> => {
  const keywords = await getProfileKeywords(userId, sourceGuildId);
  const removedKeyword = findKeyword(keywords, clearKeyword);

  if (!removedKeyword) {
    return {
      content:
        'That keyword is not in your ping-me list for ' +
        formatScope(sourceGuildId) +
        '.',
    };
  }

  const remainingKeywords = keywords.filter(
    (keyword) => keyword !== removedKeyword,
  );

  if (remainingKeywords.length === 0) {
    await deletePingMeProfile({ userId, sourceGuildId });
  } else {
    await upsertPingMeProfile({
      userId,
      sourceGuildId,
      keywords: remainingKeywords,
    });
  }

  const remainingList =
    remainingKeywords.length === 0
      ? 'You have no ping-me keywords left.'
      : `Remaining keywords: ${formatKeywords(remainingKeywords)}`;

  return {
    content:
      'Ping-me keyword ' +
      formatKeywords([removedKeyword]) +
      ' removed.\n' +
      remainingList,
  };
};

const addPingMeKeywords = async (
  userId: string,
  sourceGuildId: string,
  newKeywordsInput: string,
): Promise<PingMeCommandResult> => {
  const existingKeywords = await getProfileKeywords(userId, sourceGuildId);
  const keywords = keywordsSchema.parse([
    ...existingKeywords,
    ...parsePingMeKeywords(newKeywordsInput),
  ]);
  await upsertPingMeProfile({ userId, sourceGuildId, keywords });

  return {
    content:
      'Ping-me keywords added for ' +
      formatScope(sourceGuildId) +
      ':\n' +
      formatKeywords(keywords),
  };
};

const getPingMeProfileResult = async (
  userId: string,
  sourceGuildId: string,
): Promise<PingMeCommandResult> => {
  const keywords = await getProfileKeywords(userId, sourceGuildId);

  if (keywords.length === 0) {
    return {
      content: `You have no ping-me keywords for ${formatScope(sourceGuildId)}.`,
    };
  }

  return {
    content:
      'Your ping-me keywords for ' +
      formatScope(sourceGuildId) +
      ':\n' +
      formatKeywords(keywords),
  };
};

export const getPingMeCommandResult = async (
  input: PingMeCommandInput,
): Promise<PingMeCommandResult> => {
  const { userId, sourceGuildId, newKeywordsInput, clearKeyword } = input;
  commandInputSchema.parse({ clearKeyword, newKeywordsInput });

  if (clearKeyword) {
    return removePingMeKeyword(userId, sourceGuildId, clearKeyword);
  }

  if (newKeywordsInput) {
    return addPingMeKeywords(userId, sourceGuildId, newKeywordsInput);
  }

  return getPingMeProfileResult(userId, sourceGuildId);
};

export const findPingMeNotifications = async (
  input: PingMeMessageInput,
): Promise<PingMeNotification[]> => {
  const sourceGuildIds = getPingMeListeningSourceGuildIds(
    input.guildId,
    guildBoundary,
  );
  const profiles = await findPingMeProfilesForSources(sourceGuildIds);
  const matchesByUser = new Map<string, string>();

  for (const profile of profiles) {
    const isProdSelfPing =
      input.guildId === BOT_GUILDS.PROD_ENV &&
      profile.userId === input.authorUserId;

    if (isProdSelfPing) {
      continue;
    }

    const matchedKeyword = profile.keywords.find((keyword) =>
      doesPingMeKeywordMatch(input.content, keyword),
    );

    if (!matchedKeyword || matchesByUser.has(profile.userId)) {
      continue;
    }

    matchesByUser.set(profile.userId, matchedKeyword);
  }

  return [...matchesByUser].map(([userId, matchedKeyword]) => ({
    userId,
    matchedKeyword,
  }));
};
