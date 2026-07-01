import type { ChannelType, Client } from 'discord.js';

export const DAVI_SAY_ENVIRONMENTS = ['prod', 'staging'] as const;

export type DaviSayEnvironment = (typeof DAVI_SAY_ENVIRONMENTS)[number];

export type DaviSayDestination = {
  channelId: string;
  environment: DaviSayEnvironment;
};

export type ResolveDaviSayDestinationOptions = {
  selectedChannelId: string | null;
  selectedEnvironment: DaviSayEnvironment | null;
};

export type DaviSayChannelSummary = {
  id: string;
  name: string;
  parentName: string | null;
  type: ChannelType;
};

export type DaviSayChannelAutocompleteOptions = {
  channels: readonly DaviSayChannelSummary[];
  query: string;
};

export type DaviSayStickerSummary = {
  id: string;
  name: string;
  available: boolean;
};

export type DaviSayStickerAutocompleteOptions = {
  stickers: readonly DaviSayStickerSummary[];
  query: string;
};

export type DaviSayAutocompleteChoice = {
  name: string;
  value: string;
};

export type DaviSaySendClient = Pick<Client, 'channels'>;

export type SendDaviSayMessageOptions = {
  client: DaviSaySendClient;
  channelId: string;
  message: string | null;
  stickerId: string | null;
};
