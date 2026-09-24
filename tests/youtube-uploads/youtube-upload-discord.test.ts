import { describe, expect, it } from 'vitest';
import { buildYouTubeUploadAnnouncement } from '../../src/modules/youtube-uploads/youtube-upload.discord';

describe('YouTube upload announcements', () => {
  it('posts only the video role ping and YouTube link', () => {
    expect(
      buildYouTubeUploadAnnouncement({
        roleId: 'video-role',
        url: 'https://www.youtube.com/watch?v=video-1',
      }),
    ).toEqual({
      content: '<@&video-role>\nhttps://www.youtube.com/watch?v=video-1',
      allowedMentions: { roles: ['video-role'] },
    });
  });
});
