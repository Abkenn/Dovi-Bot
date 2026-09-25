import type { HltbGame } from './hltb.types';

const formatHourNumber = (hours: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(hours);

const formatHours = (hours: number): string =>
  `${formatHourNumber(hours)} hours`;

export const buildHltbMessage = ({
  completionistHours,
  leisureCompletionistHours,
  mainExtraHours,
  mainStoryHours,
  rushedMainStoryHours,
  title,
}: HltbGame): string => {
  const times: string[] = [];
  if (mainStoryHours !== null) {
    times.push(`Main: ${formatHours(mainStoryHours)}`);
  }
  if (mainExtraHours !== null) {
    times.push(`Main+Extra: ${formatHours(mainExtraHours)}`);
  }
  if (completionistHours !== null) {
    times.push(`Completionist: ${formatHours(completionistHours)}`);
  }

  if (times.length === 0) {
    return `${title} - No completion times available.`;
  }

  const hasRange =
    rushedMainStoryHours !== null && leisureCompletionistHours !== null;
  if (!hasRange) {
    return [title, ...times].join('\n');
  }

  const range = `~${formatHourNumber(rushedMainStoryHours)}-${formatHourNumber(leisureCompletionistHours)} hours`;
  return [`${title} (${range})`, ...times].join('\n');
};
