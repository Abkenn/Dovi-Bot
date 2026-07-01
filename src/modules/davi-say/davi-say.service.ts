import {
  ChannelType,
  type Client,
  type Guild,
  type GuildBasedChannel,
  type MessageCreateOptions,
  type ThreadChannel,
} from 'discord.js';
import { BOT_GUILDS, type BotGuildId } from '../../config/discord-access';
import type {
  DaviSayAutocompleteChoice,
  DaviSayChannelAutocompleteOptions,
  DaviSayChannelSummary,
  DaviSayDestination,
  DaviSayEnvironment,
  DaviSayStickerAutocompleteOptions,
  DaviSayStickerSummary,
  ResolveDaviSayDestinationOptions,
  SendDaviSayMessageOptions,
} from './davi-say.types';

export const DAVI_SAY_DEFAULT_STAGING_CHANNEL_ID = '1482741535610110163';

const AUTOCOMPLETE_LIMIT = 25;
const DISCORD_CHOICE_NAME_LIMIT = 100;

const CHANNEL_TYPE_LABELS: Partial<Record<ChannelType, string>> = {
  [ChannelType.GuildText]: 'text',
  [ChannelType.GuildAnnouncement]: 'announcement',
  [ChannelType.GuildForum]: 'forum',
  [ChannelType.GuildMedia]: 'media',
  [ChannelType.GuildVoice]: 'voice text',
  [ChannelType.PublicThread]: 'thread',
  [ChannelType.PrivateThread]: 'thread',
  [ChannelType.AnnouncementThread]: 'thread',
};

const INCLUDED_CHANNEL_TYPES = new Set<ChannelType>([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
  ChannelType.GuildVoice,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
]);

const isIncludedChannelType = (type: ChannelType) =>
  INCLUDED_CHANNEL_TYPES.has(type);

const getChannelTypeLabel = (type: ChannelType) =>
  CHANNEL_TYPE_LABELS[type] ?? 'channel';

const truncateChoiceName = (name: string) =>
  name.length <= DISCORD_CHOICE_NAME_LIMIT
    ? name
    : `${name.slice(0, DISCORD_CHOICE_NAME_LIMIT - 3)}...`;

const getChannelChoiceName = (channel: DaviSayChannelSummary) => {
  const path = channel.parentName
    ? `${channel.parentName} / ${channel.name}`
    : channel.name;

  return truncateChoiceName(`#${path} [${getChannelTypeLabel(channel.type)}]`);
};

const matchesQuery = (value: string, query: string) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return (
    !normalizedQuery || value.toLocaleLowerCase().includes(normalizedQuery)
  );
};

const compareChannelSummaries = (
  first: DaviSayChannelSummary,
  second: DaviSayChannelSummary,
) => getChannelChoiceName(first).localeCompare(getChannelChoiceName(second));

const toGuildChannelSummary = (
  channel: GuildBasedChannel,
): DaviSayChannelSummary | null => {
  if (!isIncludedChannelType(channel.type)) {
    return null;
  }

  return {
    id: channel.id,
    name: channel.name,
    parentName: channel.parent?.name ?? null,
    type: channel.type,
  };
};

const toThreadChannelSummary = (
  channel: ThreadChannel,
): DaviSayChannelSummary | null => {
  if (!isIncludedChannelType(channel.type)) {
    return null;
  }

  return {
    id: channel.id,
    name: channel.name,
    parentName: channel.parent?.name ?? null,
    type: channel.type,
  };
};

export const resolveDaviSayDestination = ({
  selectedChannelId,
  selectedEnvironment,
}: ResolveDaviSayDestinationOptions): DaviSayDestination => {
  if (!selectedChannelId) {
    return {
      channelId: DAVI_SAY_DEFAULT_STAGING_CHANNEL_ID,
      environment: 'staging',
    };
  }

  return {
    channelId: selectedChannelId,
    environment: selectedEnvironment ?? 'prod',
  };
};

export const getDaviSayTargetGuildId = (
  environment: DaviSayEnvironment,
): BotGuildId =>
  environment === 'staging' ? BOT_GUILDS.STAGING_ENV : BOT_GUILDS.PROD_ENV;

export const getDaviSayChannelAutocomplete = ({
  channels,
  query,
}: DaviSayChannelAutocompleteOptions): DaviSayAutocompleteChoice[] =>
  channels
    .filter((channel) => matchesQuery(getChannelChoiceName(channel), query))
    .sort(compareChannelSummaries)
    .slice(0, AUTOCOMPLETE_LIMIT)
    .map((channel) => ({
      name: getChannelChoiceName(channel),
      value: channel.id,
    }));

export const getDaviSayStickerAutocomplete = ({
  stickers,
  query,
}: DaviSayStickerAutocompleteOptions): DaviSayAutocompleteChoice[] =>
  stickers
    .filter((sticker) => sticker.available)
    .filter((sticker) => matchesQuery(sticker.name, query))
    .sort((first, second) => first.name.localeCompare(second.name))
    .slice(0, AUTOCOMPLETE_LIMIT)
    .map((sticker) => ({
      name: truncateChoiceName(sticker.name),
      value: sticker.id,
    }));

export const fetchDaviSayChannels = async (
  client: Client,
  guildId: BotGuildId,
): Promise<DaviSayChannelSummary[]> => {
  const guild = await client.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();
  const guildChannels = [...channels.values()].flatMap((channel) => {
    if (!channel) {
      return [];
    }

    const summary = toGuildChannelSummary(channel);

    return summary ? [summary] : [];
  });

  const activeThreads = await fetchActiveThreadSummaries(guild);

  return [...guildChannels, ...activeThreads];
};

export const fetchDaviSayStickers = async (
  client: Client,
  guildId: BotGuildId,
): Promise<DaviSayStickerSummary[]> => {
  const guild = await client.guilds.fetch(guildId);
  const stickers = await guild.stickers.fetch();

  return [...stickers.values()].map((sticker) => ({
    id: sticker.id,
    name: sticker.name,
    available: sticker.available !== false,
  }));
};

const fetchActiveThreadSummaries = async (
  guild: Guild,
): Promise<DaviSayChannelSummary[]> => {
  try {
    const activeThreads = await guild.channels.fetchActiveThreads();

    return [...activeThreads.threads.values()].flatMap((thread) => {
      const summary = toThreadChannelSummary(thread);

      return summary ? [summary] : [];
    });
  } catch {
    return [];
  }
};

export const sendDaviSayMessage = async ({
  client,
  channelId,
  message,
  stickerId,
}: SendDaviSayMessageOptions) => {
  if (!message && !stickerId) {
    throw new Error('Choose a message, a sticker, or both.');
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isSendable()) {
    throw new Error('Davi cannot send messages in that channel.');
  }

  const payload: MessageCreateOptions = {};

  if (message) {
    payload.content = message;
  }

  if (stickerId) {
    payload.stickers = [stickerId];
  }

  await channel.send(payload);
};
