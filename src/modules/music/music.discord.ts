import { escapeMarkdown } from 'discord.js';
import { MUSIC_CATALOG_UPLOADER_ID } from './music.config';
import type { MusicSearchView } from './music.types';

const timestamp = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const tail = String(seconds % 60).padStart(2, '0');
  if (minutes < 60) return `${minutes}:${tail}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${tail}`;
};

export const buildMusicSearchReply = (results: MusicSearchView[] | null) => {
  if (!results)
    return { content: 'The music catalog has not been imported yet.' };
  const result = results[0];
  if (!result)
    return {
      content: 'No matching tracks found. Try part of the song or game name.',
    };
  const time = timestamp(result.lastOffsetSeconds);
  let latest = `${escapeMarkdown(result.lastStream).slice(0, 150)} · ${result.lastDate} · ${time} (link unavailable)`;
  if (result.video) {
    const title = escapeMarkdown(
      result.video.title.replaceAll('\n', ' ').replaceAll('\r', ' '),
    ).slice(0, 400);
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(result.video.videoId)}&t=${result.lastOffsetSeconds}s`;
    latest = `[${title} · ${result.lastDate} · ${time}](<${url}>)`;
  }
  return {
    content: `Latest stream: ${latest}\nHeard **${result.count} ${result.count === 1 ? 'time' : 'times'}** in past streams.\n*Data collected by <@${MUSIC_CATALOG_UPLOADER_ID}>.*`,
    allowedMentions: { parse: [] },
  };
};
