import type { BossTrialVoteVerdict } from '../../../../generated/prisma/enums';

export type BossTrialButtonAction =
  | {
      type: 'vote';
      trialId: string;
      verdict: BossTrialVoteVerdict;
    }
  | {
      type: 'publish';
      trialId: string;
    }
  | {
      type: 'bump';
      trialId: string;
    };

export type BossTrialMessageInput = { trialId: string; messageId: string };

export type BossTrialWithVotes = {
  votes: { verdict: BossTrialVoteVerdict }[];
};
