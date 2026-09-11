import type { Client } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamKind } from '../../src/generated/prisma/client';
import type { StreamInfoResult } from '../../src/modules/stream-info/stream-info.types';

const queries = vi.hoisted(() => ({
  completeStreamAnnouncementChangeRequest: vi.fn(),
  createStreamAnnouncement: vi.fn(),
  createStreamAnnouncementChangeRequest: vi.fn(),
  deleteStreamAnnouncementByMessageId: vi.fn(),
  findPendingStreamAnnouncementChangeRequest: vi.fn(),
  findStreamAnnouncementByDate: vi.fn(),
  findStreamAnnouncementByMessageId: vi.fn(),
  findStreamAnnouncementPlan: vi.fn(),
  setStreamAnnouncementDecision: vi.fn(),
  updateStreamAnnouncementSnapshot: vi.fn(),
  upsertStreamAnnouncementUrlOverride: vi.fn(),
}));
const streamInfoService = vi.hoisted(() => ({
  getStreamInfo: vi.fn(),
  getStreamInfoForAnnouncementPreview: vi.fn(),
  setStreamInfo: vi.fn(),
}));
const discord = vi.hoisted(() => ({
  buildStreamAnnouncementMessages: vi.fn(),
}));

vi.mock('@data/queries/stream-announcement', () => queries);
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { PROD_ENV: 'prod-guild', STAGING_ENV: 'staging-guild' },
}));
vi.mock(
  '../../src/modules/stream-info/stream-info.service',
  () => streamInfoService,
);
vi.mock('../../src/modules/stream-info/stream-info.discord', () => discord);

import {
  applyStreamAnnouncementChange,
  declineStreamAnnouncementChange,
  prepareStreamAnnouncementChange,
  refreshTrackedStreamAnnouncement,
} from '../../src/modules/stream-info/stream-announcement-change.service';

const occurrence = {
  dateKey: '2026-09-11',
  weekday: 'FRIDAY' as const,
  startAt: new Date('2026-09-11T18:10:00.000Z'),
  endAt: new Date('2026-09-11T22:10:00.000Z'),
  streamKind: StreamKind.GAME,
  musicMode: null,
  title: 'Game Stream',
  customTitle: null,
  musicTheme: null,
  gameName: 'Unknown',
  streamUrl: 'https://youtube.test/watch?v=stream',
  videoTitle: 'Stream title',
  streamIsLive: false,
  isOverride: false,
};
const streamInfo: StreamInfoResult = {
  timezone: 'America/Sao_Paulo',
  current: null,
  previous: null,
  next: occurrence,
};
const snapshot = JSON.stringify(streamInfo);

const makeClient = (channel: unknown): Client =>
  ({
    channels: { fetch: vi.fn().mockResolvedValue(channel) },
  }) as unknown as Client;

describe('stream announcement changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.createStreamAnnouncementChangeRequest.mockResolvedValue({
      id: 'request-1',
    });
    queries.findStreamAnnouncementByDate.mockResolvedValue(null);
    queries.findStreamAnnouncementPlan.mockResolvedValue(null);
    streamInfoService.getStreamInfo.mockResolvedValue(streamInfo);
    streamInfoService.getStreamInfoForAnnouncementPreview.mockResolvedValue(
      streamInfo,
    );
    discord.buildStreamAnnouncementMessages.mockReturnValue({
      info: { content: 'stream info' },
      link: { content: 'youtube link' },
    });
  });

  it('previews a staging message-id update without applying it immediately', async () => {
    queries.findStreamAnnouncementByMessageId.mockResolvedValue({
      channelId: 'staging-channel',
      guildId: 'staging-guild',
      messageId: 'staging-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });

    const result = await prepareStreamAnnouncementChange({
      action: 'UPDATE',
      announcementMessageId: 'staging-message',
      gameName: 'Onimusha',
      now: new Date('2030-01-01T00:00:00.000Z'),
      requestedByUserId: 'user-1',
    });

    expect(result).toMatchObject({ action: 'UPDATE', requestId: 'request-1' });
    expect(queries.createStreamAnnouncementChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        targetGuildId: 'staging-guild',
        targetMessageId: 'staging-message',
      }),
    );
    expect(streamInfoService.setStreamInfo).not.toHaveBeenCalled();
  });

  it('rejects an implicit update more than one hour early', async () => {
    await expect(
      prepareStreamAnnouncementChange({
        action: 'UPDATE',
        now: new Date('2026-09-11T17:09:59.999Z'),
        requestedByUserId: 'user-1',
      }),
    ).rejects.toThrow('too early');
  });

  it('requires a message ID for deletion and rejects a message ID for push', async () => {
    await expect(
      prepareStreamAnnouncementChange({
        action: 'DELETE',
        requestedByUserId: 'user-1',
      }),
    ).rejects.toThrow('Delete requires');
    await expect(
      prepareStreamAnnouncementChange({
        action: 'PUSH',
        announcementMessageId: 'message-1',
        requestedByUserId: 'user-1',
      }),
    ).rejects.toThrow('does not use announcement_message');
  });

  it('rejects an unknown explicit staging or production message', async () => {
    queries.findStreamAnnouncementByMessageId.mockResolvedValue(null);

    await expect(
      prepareStreamAnnouncementChange({
        action: 'UPDATE',
        announcementMessageId: 'missing',
        requestedByUserId: 'user-1',
      }),
    ).rejects.toThrow('not tracked in staging or prod');
  });

  it('previews an incoming update during the final hour', async () => {
    const result = await prepareStreamAnnouncementChange({
      action: 'UPDATE',
      gameName: 'Onimusha',
      now: new Date('2026-09-11T17:20:00.000Z'),
      requestedByUserId: 'user-1',
    });

    expect(result).toMatchObject({ action: 'UPDATE', requestId: 'request-1' });
    expect(queries.createStreamAnnouncementChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        targetMessageId: null,
        streamDateKey: occurrence.dateKey,
      }),
    );
  });

  it('uses the latest tracked announcement for an implicit update', async () => {
    const record = {
      channelId: 'prod-channel',
      guildId: 'prod-guild',
      messageId: 'prod-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    };
    queries.findStreamAnnouncementByDate.mockResolvedValue(record);
    queries.findStreamAnnouncementByMessageId.mockResolvedValue(record);

    await prepareStreamAnnouncementChange({
      action: 'UPDATE',
      now: new Date('2026-09-11T17:20:00.000Z'),
      requestedByUserId: 'user-1',
      title: 'Corrected',
    });

    expect(queries.findStreamAnnouncementByMessageId).toHaveBeenCalledWith(
      'prod-message',
    );
  });

  it('previews a manual production push outside the automatic window', async () => {
    const result = await prepareStreamAnnouncementChange({
      action: 'PUSH',
      now: new Date('2026-09-01T00:00:00.000Z'),
      requestedByUserId: 'user-1',
      streamUrl: occurrence.streamUrl,
    });

    expect(result.action).toBe('PUSH');
    expect(queries.createStreamAnnouncementChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        targetChannelId: '1137241032568868865',
        targetGuildId: 'prod-guild',
      }),
    );
  });

  it('requires a URL for a manual push', async () => {
    streamInfoService.getStreamInfo.mockResolvedValue({
      ...streamInfo,
      next: { ...occurrence, streamUrl: undefined },
    });

    await expect(
      prepareStreamAnnouncementChange({
        action: 'PUSH',
        requestedByUserId: 'user-1',
      }),
    ).rejects.toThrow('Add stream_url');
  });

  it('applies an approved incoming update and URL override', async () => {
    queries.findPendingStreamAnnouncementChangeRequest.mockResolvedValue({
      id: 'request-1',
      action: 'UPDATE',
      targetChannelId: 'prod-channel',
      targetGuildId: 'prod-guild',
      targetMessageId: null,
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });

    await applyStreamAnnouncementChange({
      client: makeClient(null),
      requestId: 'request-1',
      userId: 'user-1',
    });

    expect(streamInfoService.setStreamInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: 'prod-guild',
        gameName: 'Unknown',
      }),
    );
    expect(queries.upsertStreamAnnouncementUrlOverride).toHaveBeenCalled();
  });

  it('updates the announcement if automatic posting wins the approval race', async () => {
    const edit = vi.fn();
    const fetch = vi.fn().mockResolvedValue({ edit });
    queries.findPendingStreamAnnouncementChangeRequest.mockResolvedValue({
      id: 'request-1',
      action: 'UPDATE',
      targetChannelId: 'prod-channel',
      targetGuildId: 'prod-guild',
      targetMessageId: null,
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });
    queries.findStreamAnnouncementByDate.mockResolvedValue({
      channelId: 'prod-channel',
      guildId: 'prod-guild',
      linkMessageId: 'posted-link',
      messageId: 'posted-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });

    await applyStreamAnnouncementChange({
      client: makeClient({ messages: { fetch } }),
      requestId: 'request-1',
      userId: 'user-1',
    });

    expect(fetch).toHaveBeenCalledWith('posted-message');
    expect(edit).toHaveBeenCalledWith(
      expect.objectContaining({ allowedMentions: { parse: [] } }),
    );
    expect(queries.updateStreamAnnouncementSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'posted-message' }),
    );
  });

  it('refreshes an existing announcement from its current stream occurrence', async () => {
    const edit = vi.fn();
    const fetch = vi.fn().mockResolvedValue({ edit });
    const combinedStreamInfo: StreamInfoResult = {
      ...streamInfo,
      next: {
        ...occurrence,
        streamKind: 'MUSIC',
        isCombined: true,
      },
    };
    queries.findStreamAnnouncementByDate.mockResolvedValue({
      channelId: 'prod-channel',
      guildId: 'prod-guild',
      linkMessageId: 'posted-link',
      messageId: 'posted-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });
    streamInfoService.getStreamInfoForAnnouncementPreview.mockResolvedValue(
      combinedStreamInfo,
    );

    const refreshed = await refreshTrackedStreamAnnouncement({
      client: makeClient({ messages: { fetch } }),
      guildId: 'prod-guild',
      streamDateKey: occurrence.dateKey,
    });

    expect(refreshed).toBe(true);
    expect(discord.buildStreamAnnouncementMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrence: expect.objectContaining({ isCombined: true }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith('posted-message');
    expect(fetch).toHaveBeenCalledWith('posted-link');
  });

  it('keeps the original stored YouTube title during announcement refreshes', async () => {
    const edit = vi.fn();
    const fetch = vi.fn().mockResolvedValue({ edit });
    queries.findStreamAnnouncementByDate.mockResolvedValue({
      channelId: 'prod-channel',
      guildId: 'prod-guild',
      linkMessageId: 'posted-link',
      messageId: 'posted-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });
    streamInfoService.getStreamInfoForAnnouncementPreview.mockResolvedValue({
      ...streamInfo,
      next: {
        ...occurrence,
        streamUrl: undefined,
        videoTitle: 'Renamed video title',
      },
    });

    await refreshTrackedStreamAnnouncement({
      client: makeClient({ messages: { fetch } }),
      guildId: 'prod-guild',
      streamDateKey: occurrence.dateKey,
    });

    expect(discord.buildStreamAnnouncementMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        streamInfo: expect.objectContaining({
          next: expect.objectContaining({
            videoTitle: 'Stream title',
          }),
        }),
      }),
    );
  });

  it('does nothing when the stream date has no tracked announcement', async () => {
    await expect(
      refreshTrackedStreamAnnouncement({
        client: makeClient(null),
        guildId: 'prod-guild',
        streamDateKey: occurrence.dateKey,
      }),
    ).resolves.toBe(false);

    expect(
      streamInfoService.getStreamInfoForAnnouncementPreview,
    ).not.toHaveBeenCalled();
  });

  it('restores a missing link message while refreshing an announcement', async () => {
    const edit = vi.fn();
    const fetch = vi.fn().mockResolvedValue({ edit });
    const send = vi.fn().mockResolvedValue({ id: 'replacement-link' });
    queries.findStreamAnnouncementByDate.mockResolvedValue({
      channelId: 'prod-channel',
      guildId: 'prod-guild',
      linkMessageId: null,
      messageId: 'posted-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });
    streamInfoService.getStreamInfoForAnnouncementPreview.mockResolvedValue({
      ...streamInfo,
      next: { ...occurrence, streamUrl: undefined },
    });

    await refreshTrackedStreamAnnouncement({
      client: makeClient({ messages: { fetch }, send }),
      guildId: 'prod-guild',
      streamDateKey: occurrence.dateKey,
    });

    expect(send).toHaveBeenCalledWith({ content: 'youtube link' });
    expect(queries.updateStreamAnnouncementSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ linkMessageId: 'replacement-link' }),
    );
  });

  it('applies an approved manual push and records the posted message', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ id: 'new-link-message' })
      .mockResolvedValueOnce({ id: 'new-info-message' });
    queries.findPendingStreamAnnouncementChangeRequest.mockResolvedValue({
      id: 'request-1',
      action: 'PUSH',
      targetChannelId: 'prod-channel',
      targetGuildId: 'prod-guild',
      targetMessageId: null,
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });

    await applyStreamAnnouncementChange({
      client: makeClient({ send }),
      requestId: 'request-1',
      userId: 'user-1',
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(queries.createStreamAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({
        linkMessageId: 'new-link-message',
        messageId: 'new-info-message',
      }),
    );
    expect(
      queries.completeStreamAnnouncementChangeRequest,
    ).toHaveBeenCalledWith('request-1', 'APPLIED');
  });

  it('updates a staging announcement without allowing a role re-ping', async () => {
    const edit = vi.fn();
    const fetch = vi.fn().mockResolvedValue({ edit });
    queries.findPendingStreamAnnouncementChangeRequest.mockResolvedValue({
      id: 'request-1',
      action: 'UPDATE',
      targetChannelId: 'staging-channel',
      targetGuildId: 'staging-guild',
      targetMessageId: 'staging-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });
    queries.findStreamAnnouncementByMessageId.mockResolvedValue({
      channelId: 'staging-channel',
      guildId: 'staging-guild',
      linkMessageId: 'staging-link',
      messageId: 'staging-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });

    await applyStreamAnnouncementChange({
      client: makeClient({ messages: { fetch } }),
      requestId: 'request-1',
      userId: 'user-1',
    });

    expect(edit).toHaveBeenCalledWith(
      expect.objectContaining({ allowedMentions: { parse: [] } }),
    );
    expect(queries.updateStreamAnnouncementSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'staging-message' }),
    );
  });

  it('deletes an approved announcement and its tracked record', async () => {
    const removeInfo = vi.fn();
    const removeLink = vi.fn();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ delete: removeInfo })
      .mockResolvedValueOnce({ delete: removeLink });
    queries.findPendingStreamAnnouncementChangeRequest.mockResolvedValue({
      id: 'request-1',
      action: 'DELETE',
      targetChannelId: 'prod-channel',
      targetGuildId: 'prod-guild',
      targetMessageId: 'prod-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });
    queries.findStreamAnnouncementByMessageId.mockResolvedValue({
      channelId: 'prod-channel',
      guildId: 'prod-guild',
      linkMessageId: 'prod-link',
      messageId: 'prod-message',
      streamDateKey: occurrence.dateKey,
      streamInfoJson: snapshot,
      streamUrl: occurrence.streamUrl,
    });

    await applyStreamAnnouncementChange({
      client: makeClient({
        messages: { fetch },
      }),
      requestId: 'request-1',
      userId: 'user-1',
    });

    expect(removeInfo).toHaveBeenCalledOnce();
    expect(removeLink).toHaveBeenCalledOnce();
    expect(queries.deleteStreamAnnouncementByMessageId).toHaveBeenCalledWith(
      'prod-message',
    );
    expect(queries.setStreamAnnouncementDecision).toHaveBeenCalledWith({
      guildId: 'prod-guild',
      streamDateKey: occurrence.dateKey,
      decision: 'DECLINED',
    });
  });

  it('declines only a pending request owned by the clicking user', async () => {
    queries.findPendingStreamAnnouncementChangeRequest.mockResolvedValue({
      id: 'request-1',
    });

    await declineStreamAnnouncementChange('request-1', 'user-1');

    expect(
      queries.completeStreamAnnouncementChangeRequest,
    ).toHaveBeenCalledWith('request-1', 'DECLINED');
  });

  it('rejects missing or already completed approval requests', async () => {
    queries.findPendingStreamAnnouncementChangeRequest.mockResolvedValue(null);

    await expect(
      applyStreamAnnouncementChange({
        client: makeClient(null),
        requestId: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toThrow('no longer available');
    await expect(
      declineStreamAnnouncementChange('missing', 'user-1'),
    ).rejects.toThrow('no longer available');
  });
});
