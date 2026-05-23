import { BossTrialVoteVerdict } from '../../../generated/prisma/enums';
import { DAY_MINUTES, HOUR_MINUTES } from '../../../lib/time.constants';

export const BOSS_TRIAL_CUSTOM_ID_PREFIX = 'bosstrial';
export const BOSS_TRIAL_AUTOMATIC_BUMP_AFTER_MINUTES = 12 * HOUR_MINUTES;

export const BOSS_TRIAL_VERDICTS = [
  BossTrialVoteVerdict.PEAK,
  BossTrialVoteVerdict.FAIR,
  BossTrialVoteVerdict.MID,
  BossTrialVoteVerdict.BULLSHIT,
] as const;

export const BOSS_TRIAL_VERDICT_LABELS = {
  [BossTrialVoteVerdict.PEAK]: 'Peak',
  [BossTrialVoteVerdict.FAIR]: 'Fair',
  [BossTrialVoteVerdict.MID]: 'Mid',
  [BossTrialVoteVerdict.BULLSHIT]: 'Bullshit',
} as const satisfies Record<BossTrialVoteVerdict, string>;

export const BOSS_TRIAL_DURATION_OPTIONS = {
  ONE_HOUR: {
    value: '1_hour',
    label: '1 hour',
    durationMinutes: HOUR_MINUTES,
    hiddenMinutes: 10,
  },
  ONE_DAY: {
    value: '1_day',
    label: '1 day',
    durationMinutes: DAY_MINUTES,
    hiddenMinutes: 60,
  },
} as const;

export type BossTrialDurationValue =
  (typeof BOSS_TRIAL_DURATION_OPTIONS)[keyof typeof BOSS_TRIAL_DURATION_OPTIONS]['value'];

export const getBossTrialDurationConfig = (
  value: string | null,
): (typeof BOSS_TRIAL_DURATION_OPTIONS)[keyof typeof BOSS_TRIAL_DURATION_OPTIONS] => {
  const options = Object.values(BOSS_TRIAL_DURATION_OPTIONS);

  return (
    options.find((option) => option.value === value) ??
    BOSS_TRIAL_DURATION_OPTIONS.ONE_HOUR
  );
};
