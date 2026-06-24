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
  getPingMeClearKeywordAutocomplete,
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
    expect(parsePingMeKeywords(' Dolor,  lorem   ipsum ')).toEqual([
      'Dolor',
      'lorem ipsum',
    ]);
    expect(() => parsePingMeKeywords('lorem ipsum, loremipsum')).toThrow(
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

  it('adds, displays, and removes keywords only from the invoked guild profile', async () => {
    data.findPingMeProfile.mockResolvedValue({
      keywords: ['existing'],
    });
    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'staging',
        newKeywordsInput: 'Dolor, lorem ipsum',
        clearKeyword: null,
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('this server and the production server'),
    });
    expect(data.upsertPingMeProfile).toHaveBeenCalledWith({
      userId: 'user',
      sourceGuildId: 'staging',
      keywords: ['existing', 'Dolor', 'lorem ipsum'],
    });

    data.findPingMeProfile.mockResolvedValue({
      keywords: ['amet'],
    });
    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        newKeywordsInput: null,
        clearKeyword: null,
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('this server only'),
    });

    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        newKeywordsInput: null,
        clearKeyword: 'amet',
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('removed'),
    });
    expect(data.deletePingMeProfile).toHaveBeenCalledWith({
      userId: 'user',
      sourceGuildId: 'prod',
    });
  });

  it('shows an empty profile and rejects simultaneous add and clear', async () => {
    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        newKeywordsInput: null,
        clearKeyword: null,
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('no ping-me keywords'),
    });

    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        newKeywordsInput: 'amet',
        clearKeyword: 'dolor',
      }),
    ).rejects.toThrow('Choose either new_keywords or clear');
  });

  it('removes one keyword while preserving the rest', async () => {
    data.findPingMeProfile.mockResolvedValue({
      keywords: ['Dolor', 'lorem ipsum'],
    });

    await expect(
      getPingMeCommandResult({
        userId: 'user',
        sourceGuildId: 'prod',
        newKeywordsInput: null,
        clearKeyword: 'dolor',
      }),
    ).resolves.toMatchObject({
      content: expect.stringContaining('lorem ipsum'),
    });
    expect(data.upsertPingMeProfile).toHaveBeenCalledWith({
      userId: 'user',
      sourceGuildId: 'prod',
      keywords: ['lorem ipsum'],
    });
    expect(data.deletePingMeProfile).not.toHaveBeenCalled();
  });

  it('autocompletes clear from the current profile keywords', async () => {
    data.findPingMeProfile.mockResolvedValue({
      keywords: ['Dark Souls', 'Elden Ring', 'Cake'],
    });

    await expect(
      getPingMeClearKeywordAutocomplete({
        userId: 'user',
        sourceGuildId: 'prod',
        query: 'ring',
      }),
    ).resolves.toEqual(['Elden Ring']);
  });

  it('never selects prod-created profiles for a staging message', async () => {
    data.findPingMeProfilesForSources.mockImplementation(
      async (sourceGuildIds: string[]): Promise<Profile[]> => {
        const profiles = [
          {
            userId: 'staging-user',
            sourceGuildId: 'staging',
            keywords: ['amet'],
          },
          {
            userId: 'prod-user',
            sourceGuildId: 'prod',
            keywords: ['amet'],
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
        content: 'amet',
      }),
    ).resolves.toEqual([
      {
        userId: 'staging-user',
        matchedKeyword: 'amet',
      },
    ]);
    expect(data.findPingMeProfilesForSources).toHaveBeenCalledWith(['staging']);
  });

  it('allows a staging profile to self-ping only from staging', async () => {
    data.findPingMeProfilesForSources.mockResolvedValue([
      {
        userId: 'author',
        sourceGuildId: 'staging',
        keywords: ['dolor'],
      },
    ]);

    await expect(
      findPingMeNotifications({
        guildId: 'staging',
        authorUserId: 'author',
        content: 'test dolor',
      }),
    ).resolves.toEqual([
      {
        userId: 'author',
        matchedKeyword: 'dolor',
      },
    ]);
  });

  it('merges staging and prod profile matches on prod without self-pinging', async () => {
    data.findPingMeProfilesForSources.mockResolvedValue([
      {
        userId: 'same-user',
        sourceGuildId: 'staging',
        keywords: ['lorem ipsum'],
      },
      {
        userId: 'same-user',
        sourceGuildId: 'prod',
        keywords: ['loremipsum', 'unrelated'],
      },
      {
        userId: 'author',
        sourceGuildId: 'prod',
        keywords: ['lorem ipsum'],
      },
    ]);

    await expect(
      findPingMeNotifications({
        guildId: 'prod',
        authorUserId: 'author',
        content: 'Someone mentioned lorem ipsum.',
      }),
    ).resolves.toEqual([
      {
        userId: 'same-user',
        matchedKeyword: 'lorem ipsum',
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
        content: 'amet',
      }),
    ).resolves.toEqual([]);
    expect(data.findPingMeProfilesForSources).toHaveBeenCalledWith([]);
  });
});
