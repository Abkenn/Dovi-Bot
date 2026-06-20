import { beforeEach, describe, expect, it, vi } from 'vitest';

type Profile = {
  userId: string;
  sourceGuildId: string;
  keywords: string[];
};

const data = vi.hoisted(() => ({
  deletePingMeProfile: vi.fn(),
  findPingMeProfile: vi.fn(),
  findPingMeProfilesForSources: vi.fn(),
  upsertPingMeProfile: vi.fn(),
}));

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: {
    STAGING_ENV: 'staging',
    PROD_ENV: 'prod',
  },
}));

vi.mock('../../src/data/queries/ping-me', () => data);

import {
  findPingMeNotifications,
  getPingMeCommandResult,
  parsePingMeKeywords,
} from '../../src/modules/ping-me/ping-me.service';

describe('ping-me service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    data.deletePingMeProfile.mockResolvedValue({ count: 1 });
    data.findPingMeProfile.mockResolvedValue(null);
    data.findPingMeProfilesForSources.mockResolvedValue([]);
    data.upsertPingMeProfile.mockResolvedValue({});
  });

  it('parses, trims, and validates comma-delimited keywords', () => {
    expect(parsePingMeKeywords(' Abken,  olive   oil ')).toEqual([
      'Abken',
      'olive oil',
    ]);
    expect(() => parsePingMeKeywords('olive oil, oliveoil')).toThrow(
      'Duplicate keyword',
    );
    expect(() => parsePingMeKeywords('x')).toThrow(
      'at least 3 letters or numbers',
    );
    expect(() =>
      parsePingMeKeywords(
        Array.from({ length: 21 }, (_, index) => `keyword${index}`).join(','),
      ),
    ).toThrow('up to 20 keywords');
  });

  it('saves, displays, and clears only the invoked guild profile', async () => {
    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'staging',
        keywordsInput: 'Abken, olive oil',
        clear: false,
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('this server and the production server'),
    });
    expect(data.upsertPingMeProfile).toHaveBeenCalledWith({
      userId: 'user',
      sourceGuildId: 'staging',
      keywords: ['Abken', 'olive oil'],
    });

    data.findPingMeProfile.mockResolvedValue({
      keywords: ['cake'],
    });
    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        keywordsInput: null,
        clear: false,
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('this server only'),
    });

    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        keywordsInput: null,
        clear: true,
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('cleared'),
    });
    expect(data.deletePingMeProfile).toHaveBeenCalledWith({
      userId: 'user',
      sourceGuildId: 'prod',
    });
  });

  it('shows an empty profile and rejects simultaneous save and clear', async () => {
    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        keywordsInput: null,
        clear: false,
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('no ping-me keywords'),
    });

    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        keywordsInput: 'cake',
        clear: true,
      }),
    ).rejects.toThrow('Choose either keywords or clear');
  });

  it('never selects prod-created profiles for a staging message', async () => {
    data.findPingMeProfilesForSources.mockImplementation(
      async (sourceGuildIds: string[]): Promise<Profile[]> => {
        const profiles = [
          {
            userId: 'staging-user',
            sourceGuildId: 'staging',
            keywords: ['cake'],
          },
          {
            userId: 'prod-user',
            sourceGuildId: 'prod',
            keywords: ['cake'],
          },
        ];

        return profiles.filter((profile) =>
          sourceGuildIds.includes(profile.sourceGuildId),
        );
      },
    );

    await expect(
      findPingMeNotifications({
        guildId: 'staging',
        authorUserId: 'author',
        content: 'cake',
      }),
    ).resolves.toEqual([
      {
        userId: 'staging-user',
        matchedKeywords: ['cake'],
      },
    ]);
    expect(data.findPingMeProfilesForSources).toHaveBeenCalledWith(['staging']);
  });

  it('allows a staging profile to self-ping only from staging', async () => {
    data.findPingMeProfilesForSources.mockResolvedValue([
      {
        userId: 'author',
        sourceGuildId: 'staging',
        keywords: ['abken'],
      },
    ]);

    await expect(
      findPingMeNotifications({
        guildId: 'staging',
        authorUserId: 'author',
        content: 'test abken',
      }),
    ).resolves.toEqual([
      {
        userId: 'author',
        matchedKeywords: ['abken'],
      },
    ]);
  });

  it('merges staging and prod profile matches on prod without self-pinging', async () => {
    data.findPingMeProfilesForSources.mockResolvedValue([
      {
        userId: 'same-user',
        sourceGuildId: 'staging',
        keywords: ['olive oil'],
      },
      {
        userId: 'same-user',
        sourceGuildId: 'prod',
        keywords: ['oliveoil', 'unrelated'],
      },
      {
        userId: 'author',
        sourceGuildId: 'prod',
        keywords: ['olive oil'],
      },
    ]);

    await expect(
      findPingMeNotifications({
        guildId: 'prod',
        authorUserId: 'author',
        content: 'Someone mentioned olive oil.',
      }),
    ).resolves.toEqual([
      {
        userId: 'same-user',
        matchedKeywords: ['olive oil', 'oliveoil'],
      },
    ]);
    expect(data.findPingMeProfilesForSources).toHaveBeenCalledWith([
      'staging',
      'prod',
    ]);
  });

  it('does not query subscriptions from an unrelated guild', async () => {
    await expect(
      findPingMeNotifications({
        guildId: 'other',
        authorUserId: 'author',
        content: 'cake',
      }),
    ).resolves.toEqual([]);
    expect(data.findPingMeProfilesForSources).toHaveBeenCalledWith([]);
  });
});
