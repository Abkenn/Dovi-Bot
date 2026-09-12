import {
  clearStreamAnnouncementUrlOverride,
  findStreamAnnouncementByDate,
  findStreamAnnouncementByMessageId,
  findUndoableStreamAnnouncementChangeRequest,
  undoStreamAnnouncementChangeRequest,
  upsertStreamAnnouncementUrlOverride,
} from '@data/queries/stream-announcement';
import { deserializeStreamAnnouncementSnapshot } from './stream-announcement.snapshot';
import type {
  ApplyStreamAnnouncementUndoInput,
  PreparedStreamAnnouncementUndo,
  StreamAnnouncementUndoInput,
} from './stream-announcement.types';
import { editTrackedAnnouncement } from './stream-announcement-change.service';
import {
  getStreamInfo,
  getStreamInfoForAnnouncementPreview,
  setStreamInfo,
} from './stream-info.service';
import type { StreamInfoResult, StreamOccurrence } from './stream-info.types';

const getOccurrence = (
  streamInfo: StreamInfoResult,
  streamDateKey: string,
): StreamOccurrence => {
  const occurrence = [
    streamInfo.current,
    streamInfo.previous,
    streamInfo.next,
  ].find((candidate) => candidate?.dateKey === streamDateKey);
  if (!occurrence) {
    throw new Error('The stored announcement no longer has its stream data.');
  }
  return occurrence;
};

const restoreIfUnchanged = <Value>(
  previous: Value,
  applied: Value,
  current: Value,
) => (Object.is(current, applied) ? previous : current);

const mergeUndoOccurrence = (
  previous: StreamOccurrence,
  applied: StreamOccurrence,
  current: StreamOccurrence,
): StreamOccurrence => {
  const {
    isCombined: currentIsCombined,
    streamUrl: currentStreamUrl,
    videoTitle: currentVideoTitle,
    ...requiredCurrent
  } = current;
  const merged: StreamOccurrence = {
    ...requiredCurrent,
    streamKind: restoreIfUnchanged(
      previous.streamKind,
      applied.streamKind,
      current.streamKind,
    ),
    musicMode: restoreIfUnchanged(
      previous.musicMode,
      applied.musicMode,
      current.musicMode,
    ),
    musicTheme: restoreIfUnchanged(
      previous.musicTheme,
      applied.musicTheme,
      current.musicTheme,
    ),
    title: restoreIfUnchanged(previous.title, applied.title, current.title),
    customTitle: restoreIfUnchanged(
      previous.customTitle,
      applied.customTitle,
      current.customTitle,
    ),
    gameName: restoreIfUnchanged(
      previous.gameName,
      applied.gameName,
      current.gameName,
    ),
  };
  const isCombined = restoreIfUnchanged(
    previous.isCombined,
    applied.isCombined,
    currentIsCombined,
  );
  const videoTitle = restoreIfUnchanged(
    previous.videoTitle,
    applied.videoTitle,
    currentVideoTitle,
  );
  const streamUrl = restoreIfUnchanged(
    previous.streamUrl,
    applied.streamUrl,
    currentStreamUrl,
  );
  if (isCombined !== undefined) merged.isCombined = isCombined;
  if (videoTitle !== undefined) merged.videoTitle = videoTitle;
  if (streamUrl !== undefined) merged.streamUrl = streamUrl;
  return merged;
};

const mergeUndoSnapshot = (
  previous: StreamInfoResult,
  applied: StreamInfoResult,
  current: StreamInfoResult,
  streamDateKey: string,
) => {
  const previousOccurrence = getOccurrence(previous, streamDateKey);
  const appliedOccurrence = getOccurrence(applied, streamDateKey);
  const mergeOccurrence = (occurrence: StreamOccurrence | null) =>
    occurrence?.dateKey === streamDateKey
      ? mergeUndoOccurrence(previousOccurrence, appliedOccurrence, occurrence)
      : occurrence;

  return {
    ...current,
    current: mergeOccurrence(current.current),
    previous: mergeOccurrence(current.previous),
    next: mergeOccurrence(current.next),
  };
};

const resolveStreamAnnouncementUndo = async (
  input: StreamAnnouncementUndoInput,
) => {
  const request = await findUndoableStreamAnnouncementChangeRequest(
    input.requestId,
    input.userId,
  );
  if (!request?.previousStreamInfoJson) {
    throw new Error('This announcement update is no longer available to undo.');
  }

  const trackedAnnouncement = request.targetMessageId
    ? await findStreamAnnouncementByMessageId(request.targetMessageId)
    : await findStreamAnnouncementByDate(
        request.targetGuildId,
        request.streamDateKey,
      );
  if (request.targetMessageId && !trackedAnnouncement) {
    throw new Error('The announcement is no longer tracked.');
  }
  const currentStreamInfo = trackedAnnouncement
    ? deserializeStreamAnnouncementSnapshot(trackedAnnouncement.streamInfoJson)
    : await getStreamInfoForAnnouncementPreview(
        request.targetGuildId,
        request.streamDateKey,
      );
  const previousStreamInfo = deserializeStreamAnnouncementSnapshot(
    request.previousStreamInfoJson,
  );
  const appliedStreamInfo = deserializeStreamAnnouncementSnapshot(
    request.streamInfoJson,
  );
  const streamInfo = mergeUndoSnapshot(
    previousStreamInfo,
    appliedStreamInfo,
    currentStreamInfo,
    request.streamDateKey,
  );
  const currentOccurrence = getOccurrence(
    currentStreamInfo,
    request.streamDateKey,
  );
  const streamUrl = restoreIfUnchanged(
    request.previousStreamUrl ?? '',
    request.streamUrl,
    currentOccurrence.streamUrl ?? trackedAnnouncement?.streamUrl ?? '',
  );

  const getCurrentConfigurationStreamInfo = async () => {
    if (request.targetMessageId) return null;
    const liveStreamInfo = await getStreamInfo(request.targetGuildId);
    const targetIsCurrent =
      liveStreamInfo.current?.dateKey === request.streamDateKey;
    const targetIsNext = liveStreamInfo.next?.dateKey === request.streamDateKey;
    return targetIsCurrent || targetIsNext ? liveStreamInfo : null;
  };
  const currentConfigurationStreamInfo =
    await getCurrentConfigurationStreamInfo();
  if (!trackedAnnouncement && !currentConfigurationStreamInfo) {
    throw new Error(
      'This update can no longer be safely undone because its stream has passed.',
    );
  }
  const configurationStreamInfo = currentConfigurationStreamInfo
    ? mergeUndoSnapshot(
        previousStreamInfo,
        appliedStreamInfo,
        currentConfigurationStreamInfo,
        request.streamDateKey,
      )
    : null;
  const currentConfigurationOccurrence = currentConfigurationStreamInfo
    ? getOccurrence(currentConfigurationStreamInfo, request.streamDateKey)
    : null;
  const configurationStreamUrl = currentConfigurationOccurrence
    ? restoreIfUnchanged(
        request.previousStreamUrl ?? '',
        request.streamUrl,
        currentConfigurationOccurrence.streamUrl ?? '',
      )
    : null;

  return {
    request,
    currentStreamInfo,
    currentStreamUrl:
      currentOccurrence.streamUrl ?? trackedAnnouncement?.streamUrl ?? '',
    streamInfo,
    streamUrl,
    trackedAnnouncement,
    configurationStreamInfo,
    configurationStreamUrl,
  };
};

export const prepareStreamAnnouncementUndo = async (
  input: StreamAnnouncementUndoInput,
): Promise<PreparedStreamAnnouncementUndo> => {
  const undo = await resolveStreamAnnouncementUndo(input);
  return {
    currentStreamInfo: undo.currentStreamInfo,
    currentStreamUrl: undo.currentStreamUrl,
    requestId: undo.request.id,
    streamInfo: undo.streamInfo,
    streamUrl: undo.streamUrl,
    targetGuildId: undo.request.targetGuildId,
  };
};

export const applyStreamAnnouncementUndo = async ({
  client,
  requestId,
  userId,
}: ApplyStreamAnnouncementUndoInput) => {
  const undo = await resolveStreamAnnouncementUndo({ requestId, userId });
  if (undo.configurationStreamInfo && undo.configurationStreamUrl !== null) {
    const occurrence = getOccurrence(
      undo.configurationStreamInfo,
      undo.request.streamDateKey,
    );
    await setStreamInfo({
      guildId: undo.request.targetGuildId,
      streamKind: occurrence.streamKind,
      musicMode: occurrence.musicMode,
      musicTheme: occurrence.musicTheme,
      gameName: occurrence.gameName,
      combined: occurrence.isCombined ?? false,
      title: occurrence.customTitle,
    });
    if (undo.configurationStreamUrl) {
      await upsertStreamAnnouncementUrlOverride(
        {
          guildId: undo.request.targetGuildId,
          streamDateKey: undo.request.streamDateKey,
        },
        undo.configurationStreamUrl,
      );
    } else {
      await clearStreamAnnouncementUrlOverride({
        guildId: undo.request.targetGuildId,
        streamDateKey: undo.request.streamDateKey,
      });
    }
  }

  if (undo.trackedAnnouncement) {
    await editTrackedAnnouncement({
      channelId: undo.trackedAnnouncement.channelId,
      client,
      guildId: undo.trackedAnnouncement.guildId,
      linkMessageId: undo.trackedAnnouncement.linkMessageId,
      messageId: undo.trackedAnnouncement.messageId,
      streamDateKey: undo.request.streamDateKey,
      streamInfo: undo.streamInfo,
      streamUrl: undo.streamUrl,
    });
  }

  await undoStreamAnnouncementChangeRequest(undo.request.id);
};
