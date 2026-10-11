import {
  type APIMessageTopLevelComponent,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSeasonalTheme,
  SEASONAL_DATE_OVERRIDES,
  SEASONAL_THEMES,
} from '../../src/config/seasonal-themes';
import {
  applySeasonalReplyTheme,
  createSeasonalReplySelector,
  preserveSeasonalReplyTheme,
} from '../../src/modules/command-runner/seasonal-command-theme';
import { preserveSeasonalButtonEmoji } from '../../src/modules/command-runner/seasonal-message-effects.discord';
import { buildComponentEmbedMessageFromEmbeds } from '../../src/modules/discord/component-embed';

const eye = '<a:eye:1558676165785419866>';
const halloween = () => {
  const theme = getSeasonalTheme('halloween');
  if (!theme) throw new Error('Expected Halloween configuration.');
  return theme;
};

afterEach(() => vi.useRealTimers());

describe('seasonal command selection', () => {
  it('uses the stream timezone at the October boundaries', () => {
    expect(
      getSeasonalTheme('auto', new Date('2026-10-01T02:59:59Z')),
    ).toBeNull();
    expect(getSeasonalTheme('auto', new Date('2026-10-01T03:00:00Z'))?.id).toBe(
      'halloween',
    );
    expect(getSeasonalTheme('auto', new Date('2026-11-01T02:59:59Z'))?.id).toBe(
      'halloween',
    );
    expect(
      getSeasonalTheme('auto', new Date('2026-11-01T03:00:00Z')),
    ).toBeNull();
    expect(getSeasonalTheme('toString')).toBeNull();
  });

  it('supports date-specific future holidays without implementing an Easter appearance', () => {
    const previous = SEASONAL_THEMES.easter;
    SEASONAL_THEMES.easter = { ...halloween(), id: 'easter' };
    Reflect.set(SEASONAL_DATE_OVERRIDES, '2026-04-05', 'easter');
    try {
      expect(
        getSeasonalTheme('auto', new Date('2026-04-05T12:00:00Z'))?.id,
      ).toBe('easter');
      expect(
        getSeasonalTheme('auto', new Date('2026-04-06T12:00:00Z')),
      ).toBeNull();
    } finally {
      SEASONAL_THEMES.easter = previous ?? null;
      Reflect.deleteProperty(SEASONAL_DATE_OVERRIDES, '2026-04-05');
    }
  });

  it('matches the requested user sequence for embeds', () => {
    const select = createSeasonalReplySelector();
    const users = ['you', 'you', 'you', 'you', 'other', 'third', 'fourth'];
    expect(
      users.map((userId) =>
        select({
          scope: 'prod:general',
          userId,
          kind: 'embed',
          theme: halloween(),
        }),
      ),
    ).toEqual([true, false, false, false, true, false, true]);
  });

  it('alternates different users without making all of them creepy', () => {
    const select = createSeasonalReplySelector();
    expect(
      ['a', 'b', 'c', 'd'].map((userId) =>
        select({
          scope: 'prod:general',
          userId,
          kind: 'embed',
          theme: halloween(),
        }),
      ),
    ).toEqual([true, false, true, false]);
  });

  it('themes every fifth eligible plain-text reply and skips repeats', () => {
    const select = createSeasonalReplySelector();
    expect(
      ['a', 'a', 'a', 'b', 'c', 'd', 'e', 'f'].map((userId) =>
        select({
          scope: 'prod:general',
          userId,
          kind: 'text',
          theme: halloween(),
        }),
      ),
    ).toEqual([false, false, false, false, false, false, true, false]);
  });

  it('keeps channels and reply kinds independent', () => {
    const select = createSeasonalReplySelector();
    const input = {
      scope: 'prod:general',
      userId: 'a',
      kind: 'embed',
      theme: halloween(),
    } as const;
    expect(select(input)).toBe(true);
    expect(select({ ...input, scope: 'staging:general' })).toBe(true);
    expect(select({ ...input, kind: 'text' })).toBe(false);
    expect(select({ ...input, userId: 'b' })).toBe(false);
  });

  it('supports a future theme on every reply, including repeated users', () => {
    const select = createSeasonalReplySelector();
    const theme = {
      ...halloween(),
      id: 'future',
      embed: { every: 1, first: true, repeats: 'allow' },
      text: { every: 1, first: true, repeats: 'allow' },
    } as const;
    expect(
      [1, 2, 3].map(() =>
        select({ scope: 'prod:general', userId: 'a', kind: 'embed', theme }),
      ),
    ).toEqual([true, true, true]);
  });

  it('automatically enables October only and supports explicit switches', () => {
    expect(getSeasonalTheme('auto', new Date('2026-10-11T12:00:00Z'))?.id).toBe(
      'halloween',
    );
    expect(
      getSeasonalTheme('auto', new Date('2026-12-11T12:00:00Z')),
    ).toBeNull();
    expect(getSeasonalTheme('normal')).toBeNull();
    expect(getSeasonalTheme('christmas')).toBeNull();
    expect(getSeasonalTheme('easter')).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));
    expect(getSeasonalTheme()?.id).toBe('halloween');
  });
});

describe('seasonal reply presentation', () => {
  it('preserves a current Activity eye during refresh only inside its timed window', () => {
    const fresh = {
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              style: 2,
              custom_id: 'embedded-app-stats',
              label: 'Game Stats',
              emoji: { name: '📊' },
            },
          ],
        },
      ],
    } satisfies { components: APIMessageTopLevelComponent[] };
    const previous = [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: 2,
            custom_id: 'embedded-app-stats',
            label: 'Game Stats',
            emoji: { id: '1558676165785419866', name: 'eye', animated: true },
          },
        ],
      },
    ] satisfies APIMessageTopLevelComponent[];
    expect(
      preserveSeasonalButtonEmoji(fresh, previous, eye).components,
    ).toMatchObject([
      { components: [{ emoji: { id: '1558676165785419866' } }] },
    ]);
    expect(preserveSeasonalButtonEmoji(fresh, fresh.components, eye)).toEqual(
      fresh,
    );
  });
  it('leaves a full-length text reply intact rather than exceeding Discord limits', () => {
    const reply = { content: 'x'.repeat(2000) };
    expect(applySeasonalReplyTheme(reply, halloween())).toEqual(reply);
  });
  it('prefixes plain text without changing links, mentions, or buttons', () => {
    const reply = {
      content: 'No matching tracks found. Try part of the song or game name.',
      allowedMentions: { parse: [] },
    } as const;
    expect(applySeasonalReplyTheme(reply, halloween())).toEqual({
      ...reply,
      content: `${eye} ${reply.content}`,
    });
  });

  it('changes container accents and prefixes only the first title without mutating the source', () => {
    const reply = buildComponentEmbedMessageFromEmbeds([
      new EmbedBuilder().setTitle('Stream Info').setColor(0xff3131),
      new EmbedBuilder().setTitle('More').setColor(0xff3131),
    ]);
    expect(
      applySeasonalReplyTheme(reply, halloween()).components,
    ).toMatchObject([
      {
        type: ComponentType.Container,
        accentColor: 0x8b0000,
        components: [{ content: `# ${eye} Stream Info` }],
      },
      {
        type: ComponentType.Container,
        accentColor: 0x8b0000,
        components: [{ content: '# More' }],
      },
    ]);
    expect(reply.components).toMatchObject([
      { accentColor: 0xff3131, components: [{ content: '# Stream Info' }] },
      { accentColor: 0xff3131, components: [{ content: '# More' }] },
    ]);
  });

  it('preserves a spooky stream-info refresh without advancing any counters', () => {
    const fresh = buildComponentEmbedMessageFromEmbeds([
      new EmbedBuilder().setTitle('Stream Info').setColor(0xff3131),
    ]);
    const previous = applySeasonalReplyTheme(fresh, halloween());
    expect(
      preserveSeasonalReplyTheme(fresh, previous.components ?? [], halloween()),
    ).toEqual(previous);
    expect(
      preserveSeasonalReplyTheme(fresh, previous.components ?? [], null),
    ).toEqual(fresh);
  });

  it('keeps dark red after the title eye expires and never re-adds it during refresh', () => {
    const fresh = buildComponentEmbedMessageFromEmbeds([
      new EmbedBuilder().setTitle('Stream Info').setColor(0xff3131),
    ]);
    const previous = applySeasonalReplyTheme(fresh, halloween());
    const expired = preserveSeasonalReplyTheme(
      fresh,
      previous.components ?? [],
      halloween(),
      false,
    );
    expect(expired.components).toMatchObject([
      { accentColor: 0x8b0000, components: [{ content: '# Stream Info' }] },
    ]);
    expect(
      preserveSeasonalReplyTheme(fresh, expired.components ?? [], halloween()),
    ).toEqual(expired);
  });
  it('leaves ordinary announcements and refreshes unchanged', () => {
    const fresh = buildComponentEmbedMessageFromEmbeds([
      new EmbedBuilder().setTitle('Stream Info').setColor(0xff3131),
    ]);
    expect(
      preserveSeasonalReplyTheme(fresh, fresh.components ?? [], halloween()),
    ).toEqual(fresh);
  });
});
