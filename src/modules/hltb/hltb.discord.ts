import type { HltbGame } from './hltb.types';

const formatHours = (hours: number): string =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(hours)} hours`;

export const buildHltbMessage = ({
  completionistHours,
  mainExtraHours,
  mainStoryHours,
  title,
}: HltbGame): string => {
  const times: string[] = [];
  if (mainExtraHours !== null) {
    times.push(`Main + Extras: ${formatHours(mainExtraHours)}`);
  }
  if (mainStoryHours !== null) {
    times.push(`Main Story: ${formatHours(mainStoryHours)}`);
  }
  if (completionistHours !== null) {
    times.push(`Completionist: ${formatHours(completionistHours)}`);
  }

  const [headline, ...details] = times;
  if (!headline) {
    return `${title} - No completion times available.`;
  }
  if (details.length === 0) {
    return `${title} - ${headline}`;
  }

  return `${title} - ${headline} (${details.join(', ')})`;
};
