import type { Interaction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reminderService = vi.hoisted(() => ({
  disableLiveReminder: vi.fn(),
  subscribeToStreamReminder: vi.fn(),
}));

vi.mock(
  '../../src/modules/stream-info/stream-reminder.service',
  () => reminderService,
);
vi.mock('../../src/modules/stream-info/stream-info.service', () => ({
  getStreamInfo: vi.fn(),
}));
vi.mock('../../src/config/discord-access', () => ({
  isAllowedGuildForCommand: vi.fn(),
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: { STREAM_INFO: { guildIds: [] } },
}));

import { StreamReminderButtonsListener } from '../../src/listeners/stream-reminder-buttons';

describe('stream reminder DM buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opts out the owner and updates the pre-stream DM in place', async () => {
    reminderService.disableLiveReminder.mockResolvedValue({
      reminderId: 'reminder-1',
      streamUrl: 'https://youtube.test/watch?v=stream',
      scheduledStartAt: new Date('2026-07-10T18:10:00.000Z'),
    });
    const update = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      customId: 'stream-live-alert-disable:reminder-1',
      isButton: () => true,
      reply,
      update,
      user: { id: 'user-1' },
    } as unknown as Interaction;

    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      interaction,
    );

    expect(reminderService.disableLiveReminder).toHaveBeenCalledWith({
      reminderId: 'reminder-1',
      userId: 'user-1',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        components: [
          expect.objectContaining({
            components: [
              expect.objectContaining({
                content: expect.stringContaining('Live reminder: Off'),
              }),
              expect.any(Object),
            ],
          }),
        ],
      }),
    );
    expect(reply).not.toHaveBeenCalled();
  });
});
