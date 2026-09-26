import type { HltbGame } from './hltb.types';

const formatHourNumber = (hours: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(hours);

const formatHours = (hours: number): string =>
  `${formatHourNumber(hours)} hours`;

type HltbRange = Pick<
  HltbGame,
  'rushedMainStoryHours' | 'leisureCompletionistHours'
>;

export const buildHltbRange = ({
  leisureCompletionistHours,
  rushedMainStoryHours,
}: HltbRange): string | null => {
  if (rushedMainStoryHours === null || leisureCompletionistHours === null) {
    return null;
  }

  return `~${formatHourNumber(rushedMainStoryHours)}-${formatHourNumber(leisureCompletionistHours)} hours`;
};

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

  const range = buildHltbRange({
    leisureCompletionistHours,
    rushedMainStoryHours,
  });
  if (!range) {
    return [title, ...times].join('\n');
  }

  return [`${title} (${range})`, ...times].join('\n');
};
