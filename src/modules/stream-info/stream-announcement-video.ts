import type { StreamVideo } from './stream-info.types';

const REPLACEMENT_ANNOUNCEMENT_WINDOW_MS = 25 * 60 * 1000;

type ResolveAdditionalStreamVideoActionInput = {
  currentVideos: readonly StreamVideo[];
  storedStreamUrl: string;
  storedVideos: readonly StreamVideo[];
};

export type AdditionalStreamVideoAction =
  | { type: 'NONE' }
  | { type: 'UPDATE_EXISTING'; video: StreamVideo }
  | { type: 'ANNOUNCE_REPLACEMENT'; video: StreamVideo };

const getVideoStartAt = (video: StreamVideo): Date | null =>
  video.actualStartAt ?? video.scheduledStartAt;

export const resolveAdditionalStreamVideoAction = ({
  currentVideos,
  storedStreamUrl,
  storedVideos,
}: ResolveAdditionalStreamVideoActionInput): AdditionalStreamVideoAction => {
  const knownUrls = new Set([
    storedStreamUrl,
    ...storedVideos.map((video) => video.url),
  ]);
  const newVideo = currentVideos.find((video) => !knownUrls.has(video.url));
  if (!newVideo) {
    return { type: 'NONE' };
  }

  const firstVideo = currentVideos.find(
    (video) => video.url === storedStreamUrl,
  );
  const firstLiveAt = firstVideo?.actualStartAt;
  const newVideoStartAt = getVideoStartAt(newVideo);
  if (!firstLiveAt || !newVideoStartAt) {
    return { type: 'UPDATE_EXISTING', video: newVideo };
  }

  const elapsedMs = newVideoStartAt.getTime() - firstLiveAt.getTime();
  const isReplacementWindow =
    elapsedMs >= 0 && elapsedMs <= REPLACEMENT_ANNOUNCEMENT_WINDOW_MS;

  return isReplacementWindow
    ? { type: 'ANNOUNCE_REPLACEMENT', video: newVideo }
    : { type: 'UPDATE_EXISTING', video: newVideo };
};
