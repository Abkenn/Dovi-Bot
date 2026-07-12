import type { Interaction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reminderService = vi.hoisted(() => ({
  setLiveReminderEnabled: vi.fn(),
  subscribeToStreamReminder: vi.fn(),
}));
const streamInfoService = vi.hoisted(() => ({ getStreamInfo: vi.fn() }));
const discordAccess = vi.hoisted(() => ({
  isAllowedGuildForCommand: vi.fn(),
}));

vi.mock(
  '../../src/modules/stream-info/stream-reminder.service',
  () => reminderService,
);
vi.mock(
  '../../src/modules/stream-info/stream-info.service',
  () => streamInfoService,
);
vi.mock('../../src/config/discord-access', () => discordAccess);
vi.mock('../../src/config/discord-command-metadata', () => ({
  COMMAND_METADATA: { STREAM_INFO: { guildIds: [] } },
}));

import { StreamReminderButtonsListener } from '../../src/listeners/stream-reminder-buttons';

describe('stream reminder DM buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    discordAccess.isAllowedGuildForCommand.mockReturnValue(true);
  });

  it('toggles the owner preference and updates the pre-stream DM in place', async () => {
    reminderService.setLiveReminderEnabled.mockResolvedValue({
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

    expect(reminderService.setLiveReminderEnabled).toHaveBeenCalledWith({
      enabled: false,
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

  it('re-enables the live reminder from the same DM', async () => {
    reminderService.setLiveReminderEnabled.mockResolvedValue({
      reminderId: 'reminder-1',
      streamUrl: 'https://youtube.test/watch?v=stream',
      scheduledStartAt: new Date('2026-07-10T18:10:00.000Z'),
    });
    const update = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      customId: 'stream-live-alert-enable:reminder-1',
      isButton: () => true,
      update,
      user: { id: 'user-1' },
    } as unknown as Interaction;

    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      interaction,
    );

    expect(reminderService.setLiveReminderEnabled).toHaveBeenCalledWith({
      enabled: true,
      reminderId: 'reminder-1',
      userId: 'user-1',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        components: [
          expect.objectContaining({
            components: [
              expect.objectContaining({
                content: expect.stringContaining('Live reminder: On'),
              }),
              expect.any(Object),
            ],
          }),
        ],
      }),
    );
  });

  it('ignores interactions and unrelated buttons', async () => {
    const nonButton = { isButton: () => false } as Interaction;
    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      nonButton,
    );

    const unrelated = {
      customId: 'something-else',
      isButton: () => true,
    } as unknown as Interaction;
    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      unrelated,
    );

    expect(reminderService.subscribeToStreamReminder).not.toHaveBeenCalled();
  });

  it('acknowledges a stale live-alert button without changing its message', async () => {
    reminderService.setLiveReminderEnabled.mockRejectedValue(
      new Error('stale'),
    );
    const deferUpdate = vi.fn();
    const interaction = {
      customId: 'stream-live-alert-disable:missing',
      deferUpdate,
      isButton: () => true,
      user: { id: 'user-1' },
    } as unknown as Interaction;

    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      interaction,
    );

    expect(deferUpdate).toHaveBeenCalledOnce();
  });

  it('rejects reminder buttons outside an allowed guild', async () => {
    discordAccess.isAllowedGuildForCommand.mockReturnValue(false);
    const reply = vi.fn();
    const interaction = {
      customId: 'stream-reminder:date-key',
      guildId: 'guild',
      isButton: () => true,
      reply,
    } as unknown as Interaction;

    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      interaction,
    );

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'This stream reminder is no longer available.',
      }),
    );
  });

  it('subscribes to the matching upcoming stream', async () => {
    const occurrence = {
      dateKey: 'date-key',
      endAt: new Date(Date.now() + 60 * 60_000),
      gameName: 'Dark Souls III',
      isOverride: false,
      musicMode: null,
      startAt: new Date(Date.now() + 60_000),
      streamKind: 'GAME',
      title: null,
      weekday: null,
    };
    streamInfoService.getStreamInfo.mockResolvedValue({
      current: null,
      next: occurrence,
      timezone: 'UTC',
    });
    reminderService.subscribeToStreamReminder.mockResolvedValue(undefined);
    const deferReply = vi.fn();
    const editReply = vi.fn();
    const interaction = {
      customId: 'stream-reminder:date-key',
      deferReply,
      editReply,
      guildId: 'guild',
      isButton: () => true,
      user: { id: 'user-1' },
    } as unknown as Interaction;

    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      interaction,
    );

    expect(reminderService.subscribeToStreamReminder).toHaveBeenCalledWith({
      guildId: 'guild',
      occurrence,
      userId: 'user-1',
    });
    expect(editReply).toHaveBeenCalledWith(
      expect.stringContaining('Reminder set'),
    );
  });

  it('reports stale and non-error reminder failures privately', async () => {
    streamInfoService.getStreamInfo
      .mockResolvedValueOnce({ current: null, next: null, timezone: 'UTC' })
      .mockRejectedValueOnce('offline');
    const editReply = vi.fn();
    const interaction = {
      customId: 'stream-reminder:date-key',
      deferReply: vi.fn(),
      editReply,
      guildId: 'guild',
      isButton: () => true,
      user: { id: 'user-1' },
    } as unknown as Interaction;

    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      interaction,
    );
    await StreamReminderButtonsListener.prototype.run.call(
      {} as StreamReminderButtonsListener,
      interaction,
    );

    expect(editReply).toHaveBeenNthCalledWith(
      1,
      'That stream is no longer available for reminders.',
    );
    expect(editReply).toHaveBeenNthCalledWith(
      2,
      'Something went wrong while setting the reminder.',
    );
  });
});
