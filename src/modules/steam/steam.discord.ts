import { escapeMarkdown } from 'discord.js';
import { buildHltbRange } from '../hltb/hltb.discord';
import type { SteamGameSummary } from './steam.types';

const formatScore = (score: number | null, suffix = ''): string =>
  score === null ? 'Not available' : `${Math.round(score)}${suffix}`;

export const buildSteamMessage = ({
  englishReviewPercent,
  game,
  hltbGame,
  openCriticScore,
}: SteamGameSummary): string => {
  const range = hltbGame ? buildHltbRange(hltbGame) : null;
  const title = `[${escapeMarkdown(game.title)}](<https://store.steampowered.com/app/${game.id}/>)`;
  const titleLine = range ? `${title} (${range})` : title;
  const lines = [
    titleLine,
    `English Reviews: ${formatScore(englishReviewPercent, '%')}`,
  ];
  if (openCriticScore !== null) {
    lines.push(`OpenCritic: ${formatScore(openCriticScore)}`);
  }

  return lines.join('\n');
};
