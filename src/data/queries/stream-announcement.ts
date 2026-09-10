import { prisma } from '../../lib/prisma';
import type {
  CreateStreamAnnouncementChangeRequestInput,
  CreateStreamAnnouncementInput,
  MarkStreamAnnouncementReviewSentInput,
  SetStreamAnnouncementDecisionInput,
  StreamAnnouncementPlanKey,
  UpdateStreamAnnouncementSnapshotInput,
} from './stream-announcement.types';

export const findStreamAnnouncementByDate = (
  guildId: string,
  streamDateKey: string,
) =>
  prisma.streamAnnouncement.findFirst({
    where: { guildId, streamDateKey },
    orderBy: { announcedAt: 'desc' },
  });

export const findStreamAnnouncementByMessageId = (messageId: string) =>
  prisma.streamAnnouncement.findFirst({
    where: { OR: [{ messageId }, { linkMessageId: messageId }] },
  });

export const createStreamAnnouncement = (
  input: CreateStreamAnnouncementInput,
) => prisma.streamAnnouncement.create({ data: input });

export const updateStreamAnnouncementSnapshot = (
  input: UpdateStreamAnnouncementSnapshotInput,
) => {
  const data = {
    streamUrl: input.streamUrl,
    streamInfoJson: input.streamInfoJson,
  };
  const linkMessageId = input.linkMessageId
    ? { linkMessageId: input.linkMessageId }
    : {};

  return prisma.streamAnnouncement.update({
    where: { messageId: input.messageId },
    data: { ...data, ...linkMessageId },
  });
};

export const deleteStreamAnnouncementByMessageId = (messageId: string) =>
  prisma.streamAnnouncement.deleteMany({
    where: { OR: [{ messageId }, { linkMessageId: messageId }] },
  });

export const findStreamAnnouncementPlan = (key: StreamAnnouncementPlanKey) =>
  prisma.streamAnnouncementPlan.findUnique({
    where: { guildId_streamDateKey: key },
  });

export const upsertStreamAnnouncementUrlOverride = (
  key: StreamAnnouncementPlanKey,
  streamUrl: string,
) =>
  prisma.streamAnnouncementPlan.upsert({
    where: { guildId_streamDateKey: key },
    update: { streamUrlOverride: streamUrl },
    create: { ...key, streamUrlOverride: streamUrl },
  });

export const markStreamAnnouncementReviewSent = (
  input: MarkStreamAnnouncementReviewSentInput,
) =>
  prisma.streamAnnouncementPlan.upsert({
    where: {
      guildId_streamDateKey: {
        guildId: input.guildId,
        streamDateKey: input.streamDateKey,
      },
    },
    update: {
      reviewReminderMessageId: input.messageId,
      reviewReminderNotifiedAt: new Date(),
    },
    create: {
      guildId: input.guildId,
      streamDateKey: input.streamDateKey,
      reviewReminderMessageId: input.messageId,
      reviewReminderNotifiedAt: new Date(),
    },
  });

export const setStreamAnnouncementDecision = (
  input: SetStreamAnnouncementDecisionInput,
) =>
  prisma.streamAnnouncementPlan.upsert({
    where: {
      guildId_streamDateKey: {
        guildId: input.guildId,
        streamDateKey: input.streamDateKey,
      },
    },
    update: { automaticDecision: input.decision },
    create: {
      guildId: input.guildId,
      streamDateKey: input.streamDateKey,
      automaticDecision: input.decision,
    },
  });

export const createStreamAnnouncementChangeRequest = (
  input: CreateStreamAnnouncementChangeRequestInput,
) => prisma.streamAnnouncementChangeRequest.create({ data: input });

export const findPendingStreamAnnouncementChangeRequest = (
  id: string,
  requestedByUserId: string,
) =>
  prisma.streamAnnouncementChangeRequest.findUnique({
    where: { id, requestedByUserId, status: 'PENDING' },
  });

export const completeStreamAnnouncementChangeRequest = (
  id: string,
  status: 'APPLIED' | 'DECLINED',
) =>
  prisma.streamAnnouncementChangeRequest.updateMany({
    where: { id, status: 'PENDING' },
    data: { status, completedAt: new Date() },
  });
