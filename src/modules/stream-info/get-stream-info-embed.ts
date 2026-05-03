import type { EmbedBuilder } from 'discord.js';
import { buildStreamInfoEmbed } from './stream-info.embed';
import { getStreamInfo } from './stream-info.service';

export const getStreamInfoEmbed = async (
  guildId: string,
): Promise<EmbedBuilder> => buildStreamInfoEmbed(await getStreamInfo(guildId));
