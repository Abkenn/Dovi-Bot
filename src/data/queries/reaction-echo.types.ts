export type AdvanceReactionEchoCounterInput = {
  ruleId: string;
  every: number;
  incrementBy: number;
  authorId: string;
};

export type ReactionEchoCounterRow = {
  lastAdvanceTriggered: boolean;
};
