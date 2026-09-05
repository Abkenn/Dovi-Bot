import type { Interaction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({
  setStreamAnnouncementDecision: vi.fn(),
}));
const changes = vi.hoisted(() => ({
  applyStreamAnnouncementChange: vi.fn(),
  declineStreamAnnouncementChange: vi.fn(),
}));

vi.mock('@data/queries/stream-announcement', () => queries);
vi.mock('@sapphire/framework', () => ({ Listener: class Listener {} }));
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { PROD_ENV: 'prod-guild' },
}));
vi.mock(
  '../../src/modules/stream-info/stream-announcement-change.service',
  () => changes,
);
vi.mock('../../src/modules/stream-info/stream-info.discord', () => ({
  STREAM_ANNOUNCEMENT_AUTO_APPROVE_CUSTOM_ID_PREFIX:
    'stream-announcement-auto-approve',
  STREAM_ANNOUNCEMENT_AUTO_DECLINE_CUSTOM_ID_PREFIX:
    'stream-announcement-auto-decline',
  STREAM_ANNOUNCEMENT_CHANGE_APPROVE_CUSTOM_ID_PREFIX:
    'stream-announcement-change-approve',
  STREAM_ANNOUNCEMENT_CHANGE_DECLINE_CUSTOM_ID_PREFIX:
    'stream-announcement-change-decline',
}));

import { StreamAnnouncementButtonsListener } from '../../src/listeners/stream-announcement-buttons';

describe('stream announcement controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers as an interaction listener and ignores non-buttons', async () => {
    expect(
      new StreamAnnouncementButtonsListener({} as never, {} as never),
    ).toBeInstanceOf(StreamAnnouncementButtonsListener);
    await StreamAnnouncementButtonsListener.prototype.run.call(
      {} as StreamAnnouncementButtonsListener,
      { isButton: () => false } as Interaction,
    );
    expect(queries.setStreamAnnouncementDecision).not.toHaveBeenCalled();
  });

  it('lets Abken explicitly approve automatic posting', async () => {
    const update = vi.fn();
    const interaction = {
      customId: 'stream-announcement-auto-approve:2026-09-11',
      isButton: () => true,
      update,
      user: { id: '255447271192264704' },
    } as unknown as Interaction;

    await StreamAnnouncementButtonsListener.prototype.run.call(
      {} as StreamAnnouncementButtonsListener,
      interaction,
    );

    expect(queries.setStreamAnnouncementDecision).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'APPROVED' }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Automatic production announcement approved.',
      }),
    );
  });

  it('rejects another user attempting to review automatic posting', async () => {
    const reply = vi.fn();
    const interaction = {
      customId: 'stream-announcement-auto-decline:2026-09-11',
      isButton: () => true,
      reply,
      user: { id: 'other-user' },
    } as unknown as Interaction;

    await StreamAnnouncementButtonsListener.prototype.run.call(
      {} as StreamAnnouncementButtonsListener,
      interaction,
    );

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Only Abken can review this announcement.',
      }),
    );
  });

  it('lets Abken decline one automatic announcement', async () => {
    const update = vi.fn();
    const interaction = {
      customId: 'stream-announcement-auto-decline:2026-09-11',
      isButton: () => true,
      update,
      user: { id: '255447271192264704' },
    } as unknown as Interaction;

    await StreamAnnouncementButtonsListener.prototype.run.call(
      {} as StreamAnnouncementButtonsListener,
      interaction,
    );

    expect(queries.setStreamAnnouncementDecision).toHaveBeenCalledWith({
      guildId: 'prod-guild',
      streamDateKey: '2026-09-11',
      decision: 'DECLINED',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
  });

  it('applies an approved preview request for its owner', async () => {
    changes.applyStreamAnnouncementChange.mockResolvedValue('PUSH');
    const editReply = vi.fn();
    const interaction = {
      client: {},
      customId: 'stream-announcement-change-approve:request-1',
      deferUpdate: vi.fn(),
      editReply,
      isButton: () => true,
      user: { id: 'user-1' },
    } as unknown as Interaction;

    await StreamAnnouncementButtonsListener.prototype.run.call(
      {} as StreamAnnouncementButtonsListener,
      interaction,
    );

    expect(changes.applyStreamAnnouncementChange).toHaveBeenCalledWith({
      client: interaction.client,
      requestId: 'request-1',
      userId: 'user-1',
    });
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Manual push approved and applied.' }),
    );
  });

  it('declines a preview request without applying it', async () => {
    const interaction = {
      customId: 'stream-announcement-change-decline:request-1',
      deferUpdate: vi.fn(),
      editReply: vi.fn(),
      isButton: () => true,
      user: { id: 'user-1' },
    } as unknown as Interaction;

    await StreamAnnouncementButtonsListener.prototype.run.call(
      {} as StreamAnnouncementButtonsListener,
      interaction,
    );

    expect(changes.declineStreamAnnouncementChange).toHaveBeenCalledWith(
      'request-1',
      'user-1',
    );
    expect(changes.applyStreamAnnouncementChange).not.toHaveBeenCalled();
  });

  it('shows an approval failure in the ephemeral preview', async () => {
    changes.applyStreamAnnouncementChange.mockRejectedValue(
      new Error('Discord message is gone.'),
    );
    const editReply = vi.fn();
    const interaction = {
      client: {},
      customId: 'stream-announcement-change-approve:request-1',
      deferUpdate: vi.fn(),
      editReply,
      isButton: () => true,
      user: { id: 'user-1' },
    } as unknown as Interaction;

    await StreamAnnouncementButtonsListener.prototype.run.call(
      {} as StreamAnnouncementButtonsListener,
      interaction,
    );

    expect(editReply).toHaveBeenCalledWith({
      content: 'Discord message is gone.',
      components: [],
    });
  });
});
