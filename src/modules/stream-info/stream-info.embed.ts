import { EmbedBuilder } from 'discord.js';
import { MusicMode, StreamKind } from '../../generated/prisma/client';
import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';

const discordTs = (date: Date, style: 'F' | 'R'): string => {
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:${style}>`;
};

const shouldShowGame = (occurrence: StreamOccurrence): boolean => {
  const isGame = occurrence.streamKind === StreamKind.GAME;
  const isDictatorshipMusic =
    occurrence.streamKind === StreamKind.MUSIC &&
    occurrence.musicMode === MusicMode.DICTATORSHIP;

  return isGame || isDictatorshipMusic;
};

const buildOccurrenceValue = (
  label: 'Current' | 'Next',
  occurrence: StreamOccurrence | null,
): string => {
  if (!occurrence) {
    return label === 'Next' ? 'No upcoming stream found.' : '-';
  }

  const lines = [
    occurrence.title ?? 'Stream',
    `${discordTs(occurrence.startAt, 'F')} (${discordTs(occurrence.startAt, 'R')})`,
  ];

  if (shouldShowGame(occurrence) && occurrence.gameName?.trim()) {
    lines.push(`Game: ${occurrence.gameName}`);
  }

  return lines.join('\n');
};

export const buildStreamInfoEmbed = (data: StreamInfoResult): EmbedBuilder => {
  const embed = new EmbedBuilder().setTitle('Stream Info').setColor(0x7c3aed);

  if (data.current) {
    embed.addFields({
      name: 'Current stream',
      value: buildOccurrenceValue('Current', data.current),
    });
  }

  embed.addFields({
    name: 'Next stream',
    value: buildOccurrenceValue('Next', data.next),
  });

  return embed;
};
