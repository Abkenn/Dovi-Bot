import { describe, expect, it } from 'vitest';
import { resolveAdditionalStreamVideoAction } from '../../src/modules/stream-info/stream-announcement-video';
import type { StreamVideo } from '../../src/modules/stream-info/stream-info.types';

const musicVideo: StreamVideo = {
  title: 'Music picks + ACE COMBAT Later',
  url: 'https://youtube.test/music',
  actualStartAt: new Date('2026-09-18T18:10:00.000Z'),
  scheduledStartAt: new Date('2026-09-18T18:10:00.000Z'),
};

const gameVideo = (startAt: string): StreamVideo => ({
  title: 'ACE COMBAT 7',
  url: 'https://youtube.test/game',
  actualStartAt: null,
  scheduledStartAt: new Date(startAt),
});

describe('additional combined-stream video handling', () => {
  it('updates the first announcement without another ping for the later game stream', () => {
    expect(
      resolveAdditionalStreamVideoAction({
        currentVideos: [musicVideo, gameVideo('2026-09-18T19:10:00.000Z')],
        storedStreamUrl: musicVideo.url,
        storedVideos: [musicVideo],
      }),
    ).toMatchObject({
      type: 'UPDATE_EXISTING',
      video: gameVideo('2026-09-18T19:10:00.000Z'),
    });
  });

  it('allows a replacement announcement within 25 minutes of going live', () => {
    expect(
      resolveAdditionalStreamVideoAction({
        currentVideos: [musicVideo, gameVideo('2026-09-18T18:35:00.000Z')],
        storedStreamUrl: musicVideo.url,
        storedVideos: [musicVideo],
      }),
    ).toMatchObject({ type: 'ANNOUNCE_REPLACEMENT' });
  });

  it('does not announce a replacement after the 25 minute cutoff', () => {
    expect(
      resolveAdditionalStreamVideoAction({
        currentVideos: [musicVideo, gameVideo('2026-09-18T18:35:00.001Z')],
        storedStreamUrl: musicVideo.url,
        storedVideos: [musicVideo],
      }),
    ).toMatchObject({ type: 'UPDATE_EXISTING' });
  });

  it('does nothing when the tracked announcement already contains every video', () => {
    const game = gameVideo('2026-09-18T19:10:00.000Z');
    expect(
      resolveAdditionalStreamVideoAction({
        currentVideos: [musicVideo, game],
        storedStreamUrl: musicVideo.url,
        storedVideos: [musicVideo, game],
      }),
    ).toEqual({ type: 'NONE' });
  });
});
