export type UpsertStreamReminderInput = {
  guildId: string;
  userId: string;
  streamDateKey: string;
  streamUrl: string;
  videoTitle: string;
  scheduledStartAt: Date;
};
