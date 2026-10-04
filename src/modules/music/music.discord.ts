import { escapeMarkdown } from 'discord.js';
import { MUSIC_CATALOG_UPLOADER_ID } from './music.config';
import type { MusicGameSearchView, MusicSearchView } from './music.types';
import { musicGameFamily } from './music-games';
import { isDigits, musicIdentity, musicWords } from './music-normalization';
import { musicTrackDisplayTitle } from './music-tracks';

const timestamp = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const tail = String(seconds % 60).padStart(2, '0');
  if (minutes < 60) return `${minutes}:${tail}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${tail}`;
};

const buildGameLine = (result: MusicGameSearchView) => {
  const time = timestamp(result.offsetSeconds);
  const title = escapeMarkdown(
    musicTrackDisplayTitle(result.title, result.game),
  );
  const count = `heard ${result.count} ${result.count === 1 ? 'time' : 'times'}`;
  if (!result.video) return `* ${title} (${time}; link unavailable) · ${count}`;
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(result.video.videoId)}&t=${result.offsetSeconds}s`;
  return `* [${title}](<${url}>) (${time}) · ${count}`;
};

const gameHeading = (results: MusicGameSearchView[], query = '') => {
  const games = [...new Set(results.map((result) => result.game))];
  const first = games[0] ?? '';
  const family = musicGameFamily(first);
  const broadQuery = musicIdentity(query) === musicIdentity(family);
  const numberedGame = musicWords(first).some(isDigits);
  const sameFamily = games.every(
    (game) =>
      musicWords(game).slice(0, musicWords(family).length).join(' ') ===
      musicWords(family).join(' '),
  );
  if (broadQuery && numberedGame && sameFamily) return `${family} Series`;
  if (games.length === 1) return first;
  const words = first.split(' ');
  const common = words.filter((word, index) =>
    games.every((game) => game.split(' ')[index] === word),
  );
  return common.length ? `${common.join(' ')} Series` : 'Matching games';
};

export const buildMusicSearchReply = (
  results: (MusicSearchView | MusicGameSearchView)[] | null,
  options: { game: boolean; query?: string } = { game: false },
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
    const game = gameHeading(gameResults, options.query);
    if (!game) return { content: 'No matching game tracks found.' };
    const heading = `**${escapeMarkdown(game)}**`;
    const credit = `*Data collected by <@${MUSIC_CATALOG_UPLOADER_ID}>.*`;
    const lines = gameResults.map(buildGameLine);
    const visible: string[] = [];
    for (const line of lines) {
      const remaining = lines.length - visible.length - 1;
      const note = remaining
        ? `\n${remaining} more tracks. Search a specific game to narrow the results.`
        : '';
      const candidate = `${heading}\n${[...visible, line].join('\n')}${note}\n${credit}`;
      if (candidate.length > 2_000) break;
      visible.push(line);
    }
    const remaining = lines.length - visible.length;
    const note = remaining
      ? `\n${remaining} more tracks. Search a specific game to narrow the results.`
      : '';
    const content = `${heading}\n${visible.join('\n')}${note}\n${credit}`;
    return { content, allowedMentions: { parse: [] } };
  }
  const trackResult = result as MusicSearchView;
  const matchTitle = escapeMarkdown(
    musicTrackDisplayTitle(trackResult.title, trackResult.game)
      .replaceAll('\n', ' ')
      .replaceAll('\r', ' '),
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
