import { describe, expect, it } from 'vitest';
import { buildAnnouncementLinkMessage } from '../../src/modules/discord/announcement-link-message';

describe('announcement link message', () => {
  it('does not allow mentions when no recipient is provided', () => {
    expect(
      buildAnnouncementLinkMessage({ url: 'https://example.com/watch' }),
    ).toEqual({
      content: 'https://example.com/watch',
      allowedMentions: { parse: [] },
    });
  });
});
