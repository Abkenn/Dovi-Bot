export type CreateStreamAnnouncementInput = {
  guildId: string;
  channelId: string;
  messageId: string;
  streamDateKey: string;
  streamUrl: string;
  streamInfoJson: string;
};

export type StreamAnnouncementPlanKey = {
  guildId: string;
  streamDateKey: string;
};

export type MarkStreamAnnouncementReviewSentInput =
  StreamAnnouncementPlanKey & {
    messageId: string;
  };

export type UpdateStreamAnnouncementSnapshotInput = {
  messageId: string;
  streamUrl: string;
  streamInfoJson: string;
};

export type SetStreamAnnouncementDecisionInput = StreamAnnouncementPlanKey & {
  decision: 'APPROVED' | 'DECLINED';
};

export type CreateStreamAnnouncementChangeRequestInput = {
  requestedByUserId: string;
  action: 'UPDATE' | 'PUSH' | 'DELETE';
  targetGuildId: string;
  targetChannelId: string;
  targetMessageId: string | null;
  streamDateKey: string;
  streamUrl: string;
  streamInfoJson: string;
};
