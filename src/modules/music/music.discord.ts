import { escapeMarkdown } from 'discord.js';
import { MUSIC_CATALOG_UPLOADER_ID } from './music.config';
import type { MusicGameSearchView, MusicSearchView } from './music.types';

const timestamp = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const tail = String(seconds % 60).padStart(2, '0');
  if (minutes < 60) return `${minutes}:${tail}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${tail}`;
};

const compactTitle = (title: string) => {
  const plain = escapeMarkdown(
    title.replaceAll('\n', ' ').replaceAll('\r', ' '),
  );
  return plain.length > 54 ? `${plain.slice(0, 54)}…` : plain;
};

const buildGameLine = (result: MusicGameSearchView) => {
  const time = timestamp(result.offsetSeconds);
  const fallback = `${result.streamDate} · ${time} (link unavailable)`;
  const link = result.video
    ? `[${compactTitle(result.video.title)} · ${time}](<https://www.youtube.com/watch?v=${encodeURIComponent(result.video.videoId)}&t=${result.offsetSeconds}s>)`
    : fallback;
  return `${escapeMarkdown(result.title)} · ${link}`;
};

export const buildMusicSearchReply = (
  results: (MusicSearchView | MusicGameSearchView)[] | null,
  options: { game: boolean } = { game: false },
) => {
  if (!results)
    return { content: 'The music catalog has not been imported yet.' };
  const result = results[0];
  if (!result)
    return {
      content: 'No matching tracks found. Try part of the song or game name.',
    };
  if (options.game) {
    const gameResults = results as MusicGameSearchView[];
    const game = gameResults[0]?.game;
    if (!game) return { content: 'No matching game tracks found.' };
    const lines = gameResults.map(buildGameLine);
    const content = `**${escapeMarkdown(game)}**\n${lines.join('\n')}\n*Data collected by <@${MUSIC_CATALOG_UPLOADER_ID}>.*`;
    return { content: content.slice(0, 2_000), allowedMentions: { parse: [] } };
  }
  const trackResult = result as MusicSearchView;
  const matchTitle = escapeMarkdown(
    trackResult.title.replaceAll('\n', ' ').replaceAll('\r', ' '),
  ).slice(0, 400);
  const time = timestamp(trackResult.lastOffsetSeconds);
  let latest = `${escapeMarkdown(trackResult.lastStream).slice(0, 150)} · ${trackResult.lastDate} · ${time} (link unavailable)`;
  if (trackResult.video) {
    const title = escapeMarkdown(
      trackResult.video.title.replaceAll('\n', ' ').replaceAll('\r', ' '),
    ).slice(0, 400);
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(trackResult.video.videoId)}&t=${trackResult.lastOffsetSeconds}s`;
    latest = `[${title} · ${trackResult.lastDate} · ${time}](<${url}>)`;
  }
  return {
    content: `**${matchTitle}**\nLatest stream: ${latest}\nHeard **${trackResult.count} ${trackResult.count === 1 ? 'time' : 'times'}** in past streams.\n*Data collected by <@${MUSIC_CATALOG_UPLOADER_ID}>.*`,
    allowedMentions: { parse: [] },
  };
};
