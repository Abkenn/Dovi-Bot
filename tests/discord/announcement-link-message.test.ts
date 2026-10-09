import { describe, expect, it } from 'vitest';
import { buildAnnouncementLinkMessage } from '../../src/modules/discord/announcement-link-message';

describe('announcement link message', () => {
  it('includes distinct preview URLs with one recipient mention', () => {
    expect(
      buildAnnouncementLinkMessage({
        url: 'https://youtube.test/music',
        additionalUrls: [
          'https://youtube.test/music',
          'https://youtube.test/game',
        ],
        roleId: 'video-role',
      }),
    ).toEqual({
      content:
        '<@&video-role>\nhttps://youtube.test/music\nhttps://youtube.test/game',
      allowedMentions: { roles: ['video-role'] },
    });
  });
  it('does not allow mentions when no recipient is provided', () => {
    expect(
      buildAnnouncementLinkMessage({ url: 'https://example.com/watch' }),
    ).toEqual({
      content: 'https://example.com/watch',
      allowedMentions: { parse: [] },
    });
  });
});
