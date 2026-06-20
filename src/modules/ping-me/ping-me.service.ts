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
    clear: z.boolean(),
    keywordsInput: z.string().nullable(),
  })
  .refine(({ clear, keywordsInput }) => !clear || !keywordsInput, {
    message: 'Choose either keywords or clear, not both.',
  });

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

export const getPingMeCommandResult = async (
  input: PingMeCommandInput,
): Promise<PingMeCommandResult> => {
  const { userId, sourceGuildId, keywordsInput, clear } = input;
  commandInputSchema.parse({ clear, keywordsInput });

  if (clear) {
    await deletePingMeProfile({ userId, sourceGuildId });
    return {
      content: `Ping-me keywords cleared for ${formatScope(sourceGuildId)}.`,
    };
  }

  if (keywordsInput) {
    const keywords = parsePingMeKeywords(keywordsInput);
    await upsertPingMeProfile({ userId, sourceGuildId, keywords });

    return {
      content:
        'Ping-me keywords saved for ' +
        formatScope(sourceGuildId) +
        ':\n' +
        formatKeywords(keywords),
    };
  }

  const profile = await findPingMeProfile({ userId, sourceGuildId });

  if (!profile) {
    return {
      content: `You have no ping-me keywords for ${formatScope(sourceGuildId)}.`,
    };
  }

  return {
    content:
      'Your ping-me keywords for ' +
      formatScope(sourceGuildId) +
      ':\n' +
      formatKeywords(profile.keywords),
  };
};

export const findPingMeNotifications = async (
  input: PingMeMessageInput,
): Promise<PingMeNotification[]> => {
  const sourceGuildIds = getPingMeListeningSourceGuildIds(
    input.guildId,
    guildBoundary,
  );
  const profiles = await findPingMeProfilesForSources(sourceGuildIds);
  const matchesByUser = new Map<string, Set<string>>();

  for (const profile of profiles) {
    if (profile.userId === input.authorUserId) {
      continue;
    }

    const matchedKeywords = profile.keywords.filter((keyword) =>
      doesPingMeKeywordMatch(input.content, keyword),
    );

    if (matchedKeywords.length === 0) {
      continue;
    }

    const existingMatches = matchesByUser.get(profile.userId) ?? new Set();

    for (const keyword of matchedKeywords) {
      existingMatches.add(keyword);
    }

    matchesByUser.set(profile.userId, existingMatches);
  }

  return [...matchesByUser].map(([userId, matchedKeywords]) => ({
    userId,
    matchedKeywords: [...matchedKeywords],
  }));
};
