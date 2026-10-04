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

const buildGameLine = (result: MusicGameSearchView, compact = false) => {
  const time = timestamp(result.offsetSeconds);
  const fallback = `${result.streamDate} · ${time} (link unavailable)`;
  if (compact && result.video) {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(result.video.videoId)}&t=${result.offsetSeconds}s`;
    return `[${escapeMarkdown(result.title)}](<${url}>) (${time})`;
  }
  const link = result.video
    ? `[${compactTitle(result.video.title)} · ${time}](<https://www.youtube.com/watch?v=${encodeURIComponent(result.video.videoId)}&t=${result.offsetSeconds}s>)`
    : fallback;
  return `${escapeMarkdown(result.title)} · ${link}`;
};

const gameHeading = (results: MusicGameSearchView[]) => {
  const games = [...new Set(results.map((result) => result.game))];
  const first = games[0] ?? '';
  if (games.length === 1) return first;
  const words = first.split(' ');
  const common = words.filter((word, index) =>
    games.every((game) => game.split(' ')[index] === word),
  );
  return common.length ? `${common.join(' ')} Series` : 'Matching games';
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
    const game = gameHeading(gameResults);
    if (!game) return { content: 'No matching game tracks found.' };
    const heading = `**${escapeMarkdown(game)}**`;
    const credit = `*Data collected by <@${MUSIC_CATALOG_UPLOADER_ID}>.*`;
    const fullLines = gameResults.map((result) => buildGameLine(result));
    const fullContent = `${heading}\n${fullLines.join('\n')}\n${credit}`;
    const compact = gameResults.length > 5 || fullContent.length > 1_000;
    const lines = compact
      ? gameResults.map((result) => buildGameLine(result, true))
      : fullLines;
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
