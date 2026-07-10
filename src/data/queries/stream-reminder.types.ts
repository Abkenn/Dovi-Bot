export type UpsertStreamReminderInput = {
  guildId: string;
  userId: string;
  streamDateKey: string;
  streamUrl: string | null;
  videoTitle: string | null;
  scheduledStartAt: Date;
};

export type UpdateStreamReminderAnnouncementInput = {
  guildId: string;
  streamDateKey: string;
  streamUrl: string;
  videoTitle: string;
};

export type DisableStreamLiveReminderInput = {
  reminderId: string;
  userId: string;
};
