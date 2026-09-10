import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { isStreamAnnouncementWatchWindow } from '../../src/modules/stream-info/stream-announcement-watch';

describe('stream announcement watch window', () => {
  it('runs from 2:40 to 3:15 PM São Paulo time on Fridays and Saturdays', () => {
    expect(
      isStreamAnnouncementWatchWindow(
        DateTime.fromISO('2026-09-11T14:40:00', {
          zone: 'America/Sao_Paulo',
        }),
      ),
    ).toBe(true);
    expect(
      isStreamAnnouncementWatchWindow(
        DateTime.fromISO('2026-09-12T15:14:59', {
          zone: 'America/Sao_Paulo',
        }),
      ),
    ).toBe(true);
    expect(
      isStreamAnnouncementWatchWindow(
        DateTime.fromISO('2026-09-11T14:39:59', {
          zone: 'America/Sao_Paulo',
        }),
      ),
    ).toBe(false);
    expect(
      isStreamAnnouncementWatchWindow(
        DateTime.fromISO('2026-09-11T15:15:00', {
          zone: 'America/Sao_Paulo',
        }),
      ),
    ).toBe(false);
  });
});
