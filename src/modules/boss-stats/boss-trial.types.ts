import { BossTrialVoteVerdict } from '../../generated/prisma/enums';

export const BOSS_TRIAL_CUSTOM_ID_PREFIX = 'bosstrial';

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
    durationMinutes: 60,
    hiddenMinutes: 10,
  },
  ONE_DAY: {
    value: '1_day',
    label: '1 day',
    durationMinutes: 24 * 60,
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
