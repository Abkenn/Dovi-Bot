import 'dotenv/config';

import { createHash } from 'node:crypto';
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  type APIChannel,
  type APIGuild,
  type APIMessage,
  ChannelType,
  REST,
  Routes,
  type Snowflake,
} from 'discord.js';
import { recordCommunityTopicMessage } from '../src/modules/community-topics/community-topic.service';

const DEFAULT_SEED_PATH = 'data/boss-discussion-aliases.seed.json';
const DEFAULT_MENTIONS_PATH = '.local/boss-discussion/backfill-mentions.jsonl';
const DEFAULT_SUMMARY_PATH = '.local/boss-discussion/backfill-summary.json';
const DEFAULT_CHANNEL_NAMES = ['general', 'gaming-talk', 'media', 'music-talk'];
const MAX_TOP_ROWS = 100;

type Seed = {
  games: SeedGame[];
  bosses: SeedBoss[];
};

type SeedGame = {
  canonicalName: string;
  aliases: string[];
};

type SeedBoss = {
  canonicalName: string;
  game: string;
  aliases: string[];
  weakAliases: string[];
  contextWords: string[];
  notes: string;
};

type MatchTerm = {
  raw: string;
  normalized: string;
};

type GameIndex = SeedGame & {
  aliasTerms: MatchTerm[];
};

type BossIndex = SeedBoss & {
  aliasTerms: MatchTerm[];
  weakAliasTerms: MatchTerm[];
  contextTerms: MatchTerm[];
};

type BackfillArgs = {
  dryRun: boolean;
  includeBots: boolean;
  includeThreads: boolean;
  targetProd: boolean;
  writeDb: boolean;
  channelSelectors: string[];
  beforeMessageId?: string;
  maxMessagesPerChannel?: number;
  seedPath: string;
  mentionsPath: string;
  summaryPath: string;
};

type MentionMatch = {
  canonicalName: string;
  game?: string | undefined;
  matchedAliases: string[];
  matchedWeakAliases?: string[];
  contextWords?: string[];
  confidence: number;
  intensity: number;
};

type MentionRecord = {
  messageId: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorTag: string;
  createdAt: string;
  contentHash: string;
  bossMentions: MentionMatch[];
  gameMentions: MentionMatch[];
};

type CounterRow = {
  key: string;
  count: number;
  intensity: number;
};

type NamedCounterRow = CounterRow & {
  name: string;
};

type UserCounterRow = CounterRow & {
  userId: string;
  userTag: string;
};

type UserEntityCounterRow = CounterRow & {
  userId: string;
  userTag: string;
  entityName: string;
  game?: string | undefined;
};

type MutableCounterRow = CounterRow & {
  name?: string;
  userId?: string;
  userTag?: string;
  entityName?: string;
  game?: string | undefined;
};

type BackfillSummary = {
  generatedAt: string;
  targetGuildId: string;
  seed: {
    games: number;
    bosses: number;
  };
  scanned: {
    channels: number;
    skippedChannels: number;
    messages: number;
    messagesWithReadableContent: number;
    messagesWithEmptyContent: number;
    readableContentLengthSamples: number[];
    messagesWithMentions: number;
    bossMentions: number;
    gameMentions: number;
    errors: string[];
  };
  topGames: NamedCounterRow[];
  topBosses: NamedCounterRow[];
  topUsers: UserCounterRow[];
  topUserBosses: UserEntityCounterRow[];
  topUserGames: UserEntityCounterRow[];
};

type FetchableTextChannel = {
  id: string;
  name: string;
  type: ChannelType;
};

const hasFlag = (flag: string) => process.argv.includes(flag);

const getOption = (name: string) => {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));

  return match?.slice(prefix.length);
};

const parseOptionalPositiveInteger = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${value} is not a positive integer.`);
  }

  return parsed;
};

const parseArgs = (): BackfillArgs => {
  const maxMessagesPerChannel = parseOptionalPositiveInteger(
    getOption('--max-messages-per-channel'),
  );
  const beforeMessageId = getOption('--before-message-id');

  return {
    dryRun: hasFlag('--dry-run'),
    includeBots: hasFlag('--include-bots'),
    includeThreads: hasFlag('--include-threads'),
    targetProd: hasFlag('--target-prod'),
    writeDb: hasFlag('--write-db'),
    channelSelectors:
      (getOption('--channels') ?? process.env.BOSS_DISCUSSION_BACKFILL_CHANNELS)
        ?.split(',')
        .map((channelSelector) =>
          channelSelector.trim().replace(/^#/, '').toLowerCase(),
        )
        .filter(Boolean) ?? DEFAULT_CHANNEL_NAMES,
    seedPath: getOption('--seed') ?? DEFAULT_SEED_PATH,
    mentionsPath: getOption('--mentions-output') ?? DEFAULT_MENTIONS_PATH,
    summaryPath: getOption('--summary-output') ?? DEFAULT_SUMMARY_PATH,
    ...(beforeMessageId ? { beforeMessageId } : {}),
    ...(maxMessagesPerChannel !== undefined ? { maxMessagesPerChannel } : {}),
  };
};

const normalizeForMatch = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

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

const loadSeed = (path: string): Seed => {
  const raw = readFileSync(resolve(path), 'utf8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(raw) as Seed;

  if (!Array.isArray(parsed.games) || !Array.isArray(parsed.bosses)) {
    throw new Error('Alias seed must include games[] and bosses[].');
  }

  return parsed;
};

const buildGameIndex = (games: SeedGame[]): GameIndex[] =>
  games.map((game) => ({
    ...game,
    aliasTerms: buildTerms([game.canonicalName, ...game.aliases]),
  }));

const buildBossIndex = (bosses: SeedBoss[]): BossIndex[] =>
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

const getMessageMatches = (
  message: APIMessage,
  games: GameIndex[],
  bosses: BossIndex[],
) => {
  const normalizedContent = normalizeForMatch(message.content);
  const gameMentions = games.flatMap((game) => {
    const matchedAliases = getMatchedTerms(normalizedContent, game.aliasTerms);

    if (matchedAliases.length === 0) {
      return [];
    }

    const hitCount = matchedAliases.reduce(
      (sum, match) => sum + match.count,
      0,
    );

    return [
      {
        canonicalName: game.canonicalName,
        matchedAliases: matchedAliases.map((match) => match.raw),
        confidence: roundScore(Math.min(0.95, 0.65 + hitCount * 0.08)),
        intensity: roundScore(Math.min(3, 1 + (hitCount - 1) * 0.35)),
      },
    ];
  });

  const mentionedGames = new Set(
    gameMentions.map((gameMention) => gameMention.canonicalName),
  );

  const bossMentions = bosses.flatMap((boss) => {
    const matchedAliases = getMatchedTerms(normalizedContent, boss.aliasTerms);
    const matchedWeakAliases = getMatchedTerms(
      normalizedContent,
      boss.weakAliasTerms,
    );
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
    const confidence = roundScore(
      Math.min(
        0.98,
        baseConfidence +
          (hasGameContext ? 0.12 : 0) +
          Math.min(0.18, contextHitCount * 0.04),
      ),
    );
    const intensity = roundScore(
      Math.min(
        3,
        1 +
          Math.max(0, aliasHitCount + weakHitCount - 1) * 0.35 +
          Math.min(0.4, contextHitCount * 0.08),
      ),
    );

    return [
      {
        canonicalName: boss.canonicalName,
        game: boss.game,
        matchedAliases: matchedAliases.map((match) => match.raw),
        matchedWeakAliases: matchedWeakAliases.map((match) => match.raw),
        contextWords: matchedContextWords.map((match) => match.raw),
        confidence,
        intensity,
      },
    ];
  });

  return {
    bossMentions,
    gameMentions,
  };
};

const getContentHash = (content: string) =>
  createHash('sha256').update(content).digest('hex');

const toMentionRecord = (
  message: APIMessage,
  channel: FetchableTextChannel,
  bossMentions: MentionMatch[],
  gameMentions: MentionMatch[],
): MentionRecord => ({
  messageId: message.id,
  channelId: channel.id,
  channelName: channel.name,
  authorId: message.author.id,
  authorTag: getAuthorTag(message),
  createdAt: message.timestamp,
  contentHash: getContentHash(message.content),
  bossMentions,
  gameMentions,
});

const incrementCounter = (
  counters: Map<string, MutableCounterRow>,
  key: string,
  intensity: number,
  metadata: Omit<MutableCounterRow, 'key' | 'count' | 'intensity'> = {},
) => {
  const existing = counters.get(key);

  if (existing) {
    existing.count += 1;
    existing.intensity = roundScore(existing.intensity + intensity);
    return;
  }

  counters.set(key, {
    key,
    count: 1,
    intensity: roundScore(intensity),
    ...metadata,
  });
};

const topRows = <TRow extends MutableCounterRow>(counters: Map<string, TRow>) =>
  [...counters.values()]
    .sort((left, right) => {
      if (right.intensity !== left.intensity) {
        return right.intensity - left.intensity;
      }

      return right.count - left.count;
    })
    .slice(0, MAX_TOP_ROWS);

const isFetchableTextChannel = (
  channel: APIChannel,
): channel is APIChannel & FetchableTextChannel =>
  'name' in channel &&
  typeof channel.name === 'string' &&
  [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.PublicThread,
    ChannelType.PrivateThread,
    ChannelType.AnnouncementThread,
  ].includes(channel.type);

const getChannelLabel = (channel: FetchableTextChannel) =>
  `${channel.name} (${ChannelType[channel.type] ?? channel.type})`;

const getChannelName = (channel: FetchableTextChannel) =>
  channel.name.toLowerCase();

const getOldestMessage = (messages: APIMessage[]) =>
  messages.reduce<APIMessage | null>((oldestMessage, message) => {
    if (
      !oldestMessage ||
      new Date(message.timestamp).getTime() <
        new Date(oldestMessage.timestamp).getTime()
    ) {
      return message;
    }

    return oldestMessage;
  }, null);

const getAuthorTag = (message: APIMessage) => {
  const discriminator =
    'discriminator' in message.author
      ? message.author.discriminator
      : undefined;

  if (discriminator && discriminator !== '0') {
    return `${message.author.username}#${discriminator}`;
  }

  return message.author.username;
};

const ensureParentDirectory = (path: string) => {
  mkdirSync(dirname(resolve(path)), { recursive: true });
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  return value;
};

const getTargetGuildId = (args: BackfillArgs) => {
  const explicitTargetGuildId =
    process.env.BOSS_DISCUSSION_BACKFILL_TARGET_GUILD_ID;

  if (explicitTargetGuildId) {
    return explicitTargetGuildId;
  }

  if (args.targetProd) {
    return getRequiredEnv('DISCORD_PROD_ENV_GUILD_ID');
  }

  return getRequiredEnv('DISCORD_STAGING_ENV_GUILD_ID');
};

const assertAllowedTargetGuild = (targetGuildId: string) => {
  const knownGuildIds = [
    getRequiredEnv('DISCORD_STAGING_ENV_GUILD_ID'),
    getRequiredEnv('DISCORD_PROD_ENV_GUILD_ID'),
  ];

  if (knownGuildIds.includes(targetGuildId)) {
    return;
  }

  if (process.env.ALLOW_NON_STAGING_BOSS_DISCUSSION_BACKFILL === 'true') {
    return;
  }

  throw new Error(
    [
      'Boss discussion backfill only targets the configured staging or prod guild by default.',
      'Set ALLOW_NON_STAGING_BOSS_DISCUSSION_BACKFILL=true if you intentionally',
      'want to scan a different guild from a local run.',
    ].join(' '),
  );
};

const scanChannel = async (
  rest: REST,
  guildId: string,
  channel: FetchableTextChannel,
  args: BackfillArgs,
  indexes: { games: GameIndex[]; bosses: BossIndex[] },
  onMentionRecord: (record: MentionRecord) => void,
) => {
  let before: Snowflake | undefined = args.beforeMessageId;
  let scannedMessages = 0;
  let messagesWithReadableContent = 0;
  let messagesWithEmptyContent = 0;
  const readableContentLengthSamples: number[] = [];
  let messagesWithMentions = 0;
  let bossMentionCount = 0;
  let gameMentionCount = 0;

  while (true) {
    const remaining = args.maxMessagesPerChannel
      ? args.maxMessagesPerChannel - scannedMessages
      : 100;

    if (remaining <= 0) {
      break;
    }

    const query = new URLSearchParams({
      limit: String(Math.min(100, remaining)),
    });

    if (before !== undefined) {
      query.set('before', before);
    }

    const messages = (await rest.get(Routes.channelMessages(channel.id), {
      query,
    })) as APIMessage[];

    if (messages.length === 0) {
      break;
    }

    for (const message of messages) {
      scannedMessages += 1;

      if (!args.includeBots && message.author.bot === true) {
        continue;
      }

      if (!message.content.trim()) {
        messagesWithEmptyContent += 1;
        continue;
      }

      messagesWithReadableContent += 1;
      if (readableContentLengthSamples.length < 10) {
        readableContentLengthSamples.push(message.content.length);
      }

      const { bossMentions, gameMentions } = getMessageMatches(
        message,
        indexes.games,
        indexes.bosses,
      );

      if (bossMentions.length === 0 && gameMentions.length === 0) {
        continue;
      }

      messagesWithMentions += 1;
      bossMentionCount += bossMentions.length;
      gameMentionCount += gameMentions.length;

      if (args.writeDb) {
        await recordCommunityTopicMessage({
          guildId,
          channelId: channel.id,
          messageId: message.id,
          authorUserId: message.author.id,
          messageCreatedAt: new Date(message.timestamp),
          content: message.content,
          source: 'BACKFILL',
        });
      }

      onMentionRecord(
        toMentionRecord(message, channel, bossMentions, gameMentions),
      );
    }

    before = getOldestMessage(messages)?.id;

    if (!before) {
      break;
    }
  }

  return {
    scannedMessages,
    messagesWithReadableContent,
    messagesWithEmptyContent,
    readableContentLengthSamples,
    messagesWithMentions,
    bossMentionCount,
    gameMentionCount,
  };
};

const main = async () => {
  const args = parseArgs();
  const seed = loadSeed(args.seedPath);
  const indexes = {
    games: buildGameIndex(seed.games),
    bosses: buildBossIndex(seed.bosses),
  };

  console.log(
    `Loaded alias seed: ${seed.games.length} games, ${seed.bosses.length} bosses.`,
  );

  if (args.dryRun) {
    console.log('Dry run complete. No Discord connection was opened.');
    return;
  }

  const targetGuildId = getTargetGuildId(args);

  assertAllowedTargetGuild(targetGuildId);
  ensureParentDirectory(args.mentionsPath);
  ensureParentDirectory(args.summaryPath);

  const mentionStream = createWriteStream(resolve(args.mentionsPath), {
    flags: 'w',
  });
  const rest = new REST({ version: '10' }).setToken(
    getRequiredEnv('DISCORD_TOKEN'),
  );

  const gameCounters = new Map<string, MutableCounterRow>();
  const bossCounters = new Map<string, MutableCounterRow>();
  const userCounters = new Map<string, MutableCounterRow>();
  const userBossCounters = new Map<string, MutableCounterRow>();
  const userGameCounters = new Map<string, MutableCounterRow>();
  const errors: string[] = [];

  let scannedChannels = 0;
  let skippedChannels = 0;
  let scannedMessages = 0;
  let messagesWithReadableContent = 0;
  let messagesWithEmptyContent = 0;
  const readableContentLengthSamples: number[] = [];
  let messagesWithMentions = 0;
  let bossMentionCount = 0;
  let gameMentionCount = 0;

  try {
    const guild = (await rest.get(Routes.guild(targetGuildId))) as APIGuild;
    const channels = (await rest.get(
      Routes.guildChannels(targetGuildId),
    )) as APIChannel[];
    const channelSelectorSet = new Set(args.channelSelectors);
    const scannableChannels: FetchableTextChannel[] = [];

    for (const channel of channels) {
      if (
        isFetchableTextChannel(channel) &&
        (channelSelectorSet.has(getChannelName(channel)) ||
          channelSelectorSet.has(channel.id))
      ) {
        scannableChannels.push(channel);
      }
    }

    console.log(
      `Scanning ${scannableChannels.length} text channels in ${guild.name}: ${args.channelSelectors
        .map((channelSelector) =>
          /^\d+$/.test(channelSelector)
            ? channelSelector
            : `#${channelSelector}`,
        )
        .join(', ')}.`,
    );

    for (const channel of scannableChannels) {
      scannedChannels += 1;

      try {
        console.log(`Scanning #${getChannelLabel(channel)}...`);

        const channelResult = await scanChannel(
          rest,
          targetGuildId,
          channel,
          args,
          indexes,
          (record) => {
            mentionStream.write(`${JSON.stringify(record)}\n`);

            for (const gameMention of record.gameMentions) {
              incrementCounter(
                gameCounters,
                gameMention.canonicalName,
                gameMention.intensity,
                { name: gameMention.canonicalName },
              );
              incrementCounter(
                userGameCounters,
                `${record.authorId}:${gameMention.canonicalName}`,
                gameMention.intensity,
                {
                  userId: record.authorId,
                  userTag: record.authorTag,
                  entityName: gameMention.canonicalName,
                },
              );
            }

            for (const bossMention of record.bossMentions) {
              incrementCounter(
                bossCounters,
                `${bossMention.game}:${bossMention.canonicalName}`,
                bossMention.intensity,
                {
                  name: bossMention.canonicalName,
                  game: bossMention.game,
                },
              );
              incrementCounter(
                userBossCounters,
                `${record.authorId}:${bossMention.game}:${bossMention.canonicalName}`,
                bossMention.intensity,
                {
                  userId: record.authorId,
                  userTag: record.authorTag,
                  entityName: bossMention.canonicalName,
                  game: bossMention.game,
                },
              );
            }

            const totalIntensity =
              record.gameMentions.reduce(
                (sum, mention) => sum + mention.intensity,
                0,
              ) +
              record.bossMentions.reduce(
                (sum, mention) => sum + mention.intensity,
                0,
              );

            incrementCounter(userCounters, record.authorId, totalIntensity, {
              userId: record.authorId,
              userTag: record.authorTag,
            });
          },
        );

        scannedMessages += channelResult.scannedMessages;
        messagesWithReadableContent +=
          channelResult.messagesWithReadableContent;
        messagesWithEmptyContent += channelResult.messagesWithEmptyContent;
        readableContentLengthSamples.push(
          ...channelResult.readableContentLengthSamples.slice(
            0,
            10 - readableContentLengthSamples.length,
          ),
        );
        messagesWithMentions += channelResult.messagesWithMentions;
        bossMentionCount += channelResult.bossMentionCount;
        gameMentionCount += channelResult.gameMentionCount;
      } catch (error) {
        skippedChannels += 1;
        errors.push(
          `${getChannelLabel(channel)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (args.includeThreads) {
      console.log(
        'Thread scanning is reserved for a follow-up pass; top-level channels are complete.',
      );
    }

    const summary: BackfillSummary = {
      generatedAt: new Date().toISOString(),
      targetGuildId,
      seed: {
        games: seed.games.length,
        bosses: seed.bosses.length,
      },
      scanned: {
        channels: scannedChannels,
        skippedChannels,
        messages: scannedMessages,
        messagesWithReadableContent,
        messagesWithEmptyContent,
        readableContentLengthSamples,
        messagesWithMentions,
        bossMentions: bossMentionCount,
        gameMentions: gameMentionCount,
        errors,
      },
      topGames: topRows(gameCounters).map((row) => ({
        key: row.key,
        name: row.name ?? row.key,
        count: row.count,
        intensity: row.intensity,
      })),
      topBosses: topRows(bossCounters).map((row) => ({
        key: row.key,
        name: row.name ?? row.key,
        count: row.count,
        intensity: row.intensity,
      })),
      topUsers: topRows(userCounters).map((row) => ({
        key: row.key,
        userId: row.userId ?? row.key,
        userTag: row.userTag ?? row.key,
        count: row.count,
        intensity: row.intensity,
      })),
      topUserBosses: topRows(userBossCounters).map((row) => ({
        key: row.key,
        userId: row.userId ?? row.key,
        userTag: row.userTag ?? row.key,
        entityName: row.entityName ?? row.key,
        game: row.game,
        count: row.count,
        intensity: row.intensity,
      })),
      topUserGames: topRows(userGameCounters).map((row) => ({
        key: row.key,
        userId: row.userId ?? row.key,
        userTag: row.userTag ?? row.key,
        entityName: row.entityName ?? row.key,
        count: row.count,
        intensity: row.intensity,
      })),
    };

    writeFileSync(
      resolve(args.summaryPath),
      `${JSON.stringify(summary, null, 2)}\n`,
    );

    console.log(
      `Backfill complete: ${scannedMessages} messages, ${messagesWithMentions} with mentions.`,
    );
    console.log(`Mentions: ${args.mentionsPath}`);
    console.log(`Summary: ${args.summaryPath}`);
  } finally {
    mentionStream.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
