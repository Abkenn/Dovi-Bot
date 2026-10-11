import {
  type APIMessageTopLevelComponent,
  ComponentType,
  type Message,
} from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSeasonalTheme } from '../../src/config/seasonal-themes';

const db = vi.hoisted(() => ({
  saveSeasonalMessageEffect: vi.fn(),
  findSeasonalMessageEffects: vi.fn(),
  deleteSeasonalMessageEffect: vi.fn(),
}));
vi.mock('../../src/data/queries/seasonal-message-effects', () => db);
vi.mock('../../src/modules/command-runner/seasonal-theme.service', () => ({
  getBotSeasonalTheme: vi.fn(async () => getSeasonalTheme('halloween')),
}));

import {
  startSeasonalMessageEffectRecovery,
  trackSeasonalMessageEffects,
} from '../../src/modules/command-runner/seasonal-message-effects';
import { getBotSeasonalTheme } from '../../src/modules/command-runner/seasonal-theme.service';

const eye = '<a:eye:1558676165785419866>';
const halloween = () => {
  const theme = getSeasonalTheme('halloween');
  if (!theme) throw new Error('Missing Halloween profile');
  return theme;
};
const makeMessage = (id: string, title = `# ${eye} Stream Info`) => {
  let components: APIMessageTopLevelComponent[] = [
    {
      type: ComponentType.Container,
      accent_color: 0x8b0000,
      components: [{ type: ComponentType.TextDisplay, content: title }],
    },
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
        {
          type: ComponentType.Button,
          style: 5,
          label: 'Link',
          url: 'https://example.com',
        },
      ],
    },
  ];
  const message = {
    id,
    guildId: 'prod',
    channelId: 'general',
    content: '',
    flags: { has: () => false },
    get components() {
      return components.map((component) => ({ toJSON: () => component }));
    },
    fetch: vi.fn(),
    edit: vi.fn(
      async (options: {
        components: APIMessageTopLevelComponent[];
        content?: string;
      }) => {
        components = options.components;
        if (options.content !== undefined) message.content = options.content;
      },
    ),
  };
  message.fetch.mockResolvedValue(message);
  return { message, getComponents: () => components };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));
  vi.clearAllMocks();
  vi.mocked(getBotSeasonalTheme).mockResolvedValue(halloween());
  db.deleteSeasonalMessageEffect.mockResolvedValue({ count: 1 });
  db.saveSeasonalMessageEffect.mockImplementation(async (input) => input);
});
afterEach(() => vi.useRealTimers());

describe('seasonal Discord message effects', () => {
  it('does not schedule cleanup when a theme has no temporary effects', async () => {
    const { effects: _effects, ...permanentTheme } = halloween();
    const { message } = makeMessage('permanent');
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      permanentTheme,
    );
    expect(db.saveSeasonalMessageEffect).not.toHaveBeenCalled();
  });
  it('can expire a decoration without changing Activity buttons', async () => {
    const theme = { ...halloween(), effects: { emojiLifetimeMs: 900000 } };
    const { message, getComponents } = makeMessage('text-only');
    await trackSeasonalMessageEffects(message as unknown as Message, theme);
    await vi.advanceTimersByTimeAsync(15000);
    expect(message.edit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(885000);
    expect(getComponents()[0]).toMatchObject({
      accent_color: 0x8b0000,
      components: [{ content: '# Stream Info' }],
    });
    expect(getComponents()[1]).toMatchObject({
      components: [{ emoji: { name: '📊' } }, { url: 'https://example.com' }],
    });
  });
  it('uses another season’s emoji and cleanup timing while keeping its accent', async () => {
    const easter = {
      ...halloween(),
      id: 'easter',
      emoji: '🐰',
      effects: {
        emojiLifetimeMs: 10000,
        activityButton: { delayMs: 1000, durationMs: 2000 },
      },
    };
    vi.mocked(getBotSeasonalTheme).mockResolvedValue(easter);
    const { message, getComponents } = makeMessage(
      'easter',
      '# 🐰 Stream Info',
    );
    await trackSeasonalMessageEffects(message as unknown as Message, easter);
    await vi.advanceTimersByTimeAsync(1000);
    expect(getComponents()[1]).toMatchObject({
      components: [{ emoji: { name: '🐰' } }, { url: 'https://example.com' }],
    });
    await vi.advanceTimersByTimeAsync(9000);
    expect(getComponents()[0]).toMatchObject({
      accent_color: 0x8b0000,
      components: [{ content: '# Stream Info' }],
    });
  });
  it('uses the current deadline after a slow Discord fetch', async () => {
    const { message, getComponents } = makeMessage('slow-fetch');
    message.fetch.mockImplementationOnce(async () => {
      vi.setSystemTime(new Date('2026-10-11T12:15:01Z'));
      return message;
    });
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    await vi.advanceTimersByTimeAsync(15000);
    expect(getComponents()[0]).toMatchObject({
      accent_color: 0x8b0000,
      components: [{ content: '# Stream Info' }],
    });
    expect(db.deleteSeasonalMessageEffect).toHaveBeenCalledWith('slow-fetch');
  });
  it('swaps the Activity button at 15 seconds, restores it at 75 seconds, and removes the title eye at 15 minutes while retaining dark red', async () => {
    const { message, getComponents } = makeMessage('sequence');
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    await vi.advanceTimersByTimeAsync(14999);
    expect(message.edit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(getComponents()[1]).toMatchObject({
      components: [
        { emoji: { id: '1558676165785419866', animated: true } },
        { url: 'https://example.com' },
      ],
    });
    await vi.advanceTimersByTimeAsync(60000);
    expect(getComponents()[1]).toMatchObject({
      components: [{ emoji: { name: '📊' } }, { url: 'https://example.com' }],
    });
    await vi.advanceTimersByTimeAsync(825000);
    expect(getComponents()[0]).toMatchObject({
      accent_color: 0x8b0000,
      components: [{ content: '# Stream Info' }],
    });
    expect(db.deleteSeasonalMessageEffect).toHaveBeenCalledWith('sequence');
  });

  it('expires plain-text eyes without changing the response text', async () => {
    const { message, getComponents } = makeMessage('text-expiry');
    getComponents().splice(0);
    message.content = `${eye} No matching tracks found.`;
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    await vi.advanceTimersByTimeAsync(900000);
    expect(message.content).toBe('No matching tracks found.');
    expect(message.edit).toHaveBeenCalledTimes(1);
  });

  it('preserves newer content and never resurrects removed controls', async () => {
    const { message, getComponents } = makeMessage('updated-message');
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    getComponents().splice(1, 1);
    const container = getComponents()[0];
    if (container?.type !== ComponentType.Container)
      throw new Error('Missing container');
    const title = container.components[0];
    if (title?.type !== ComponentType.TextDisplay)
      throw new Error('Missing title');
    title.content = `# ${eye} Updated Stream Info`;
    await vi.advanceTimersByTimeAsync(900000);
    expect(getComponents()).toMatchObject([
      {
        accent_color: 0x8b0000,
        components: [{ content: '# Updated Stream Info' }],
      },
    ]);
  });

  it('preserves an emoji changed by newer work during the eye phase', async () => {
    const { message, getComponents } = makeMessage('newer-emoji');
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    await vi.advanceTimersByTimeAsync(15000);
    const row = getComponents()[1];
    if (row?.type !== ComponentType.ActionRow)
      throw new Error('Missing buttons');
    const button = row.components[0];
    if (button?.type !== ComponentType.Button || !('custom_id' in button))
      throw new Error('Missing button');
    button.emoji = { name: '🎮' };
    await vi.advanceTimersByTimeAsync(60000);
    expect(getComponents()[1]).toMatchObject({
      components: [{ emoji: { name: '🎮' } }, { url: 'https://example.com' }],
    });
  });

  it('keeps live cleanup timers when persistence is temporarily unavailable', async () => {
    const { message, getComponents } = makeMessage('db-failure');
    db.saveSeasonalMessageEffect.mockRejectedValueOnce(new Error('Offline'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    await vi.advanceTimersByTimeAsync(900000);
    expect(getComponents()[0]).toMatchObject({
      components: [{ content: '# Stream Info' }],
    });
    log.mockRestore();
  });

  it('retries a transient Discord fetch failure without extending the phase deadlines', async () => {
    const { message, getComponents } = makeMessage('fetch-retry');
    message.fetch.mockRejectedValueOnce(new Error('Temporary outage'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    await vi.advanceTimersByTimeAsync(20000);
    expect(getComponents()[1]).toMatchObject({
      components: [
        { emoji: { id: '1558676165785419866' } },
        { url: 'https://example.com' },
      ],
    });
    await vi.advanceTimersByTimeAsync(55000);
    expect(getComponents()[1]).toMatchObject({
      components: [{ emoji: { name: '📊' } }, { url: 'https://example.com' }],
    });
    log.mockRestore();
  });

  it('drops cleanup for deleted messages and ignores private or ordinary replies', async () => {
    const { message } = makeMessage('deleted');
    message.fetch.mockRejectedValueOnce(
      Object.assign(new Error('Deleted'), { code: 10008 }),
    );
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    await vi.advanceTimersByTimeAsync(15000);
    expect(db.deleteSeasonalMessageEffect).toHaveBeenCalledWith('deleted');
    const privateMessage = makeMessage('private').message;
    privateMessage.flags.has = () => true;
    await trackSeasonalMessageEffects(
      privateMessage as unknown as Message,
      halloween(),
    );
    await trackSeasonalMessageEffects(undefined, halloween());
    const ordinary = makeMessage('ordinary', '# Ordinary');
    ordinary.getComponents().splice(1);
    await trackSeasonalMessageEffects(
      ordinary.message as unknown as Message,
      halloween(),
    );
    expect(db.saveSeasonalMessageEffect).toHaveBeenCalledTimes(1);
  });

  it('recovers overdue title and button cleanup after a restart', async () => {
    const { message, getComponents } = makeMessage('restart');
    const row = getComponents()[1];
    if (row?.type !== ComponentType.ActionRow)
      throw new Error('Missing buttons');
    const button = row.components[0];
    if (button?.type !== ComponentType.Button || !('custom_id' in button))
      throw new Error('Missing button');
    button.emoji = { id: '1558676165785419866', name: 'eye', animated: true };
    db.findSeasonalMessageEffects.mockResolvedValue([
      {
        messageId: 'restart',
        channelId: 'general',
        buttonSwapAt: new Date(Date.now() - 900000),
        buttonRestoreAt: new Date(Date.now() - 800000),
        eyeExpiresAt: new Date(Date.now() - 1),
        eyeEmoji: eye,
        originalButtons: [
          { customId: 'embedded-app-stats', emoji: { name: '📊' } },
        ],
      },
    ]);
    const client = {
      channels: {
        fetch: vi.fn().mockResolvedValue({
          isTextBased: () => true,
          messages: { fetch: vi.fn().mockResolvedValue(message) },
        }),
      },
    };
    startSeasonalMessageEffectRecovery(client as never);
    await vi.advanceTimersByTimeAsync(1);
    expect(getComponents()[0]).toMatchObject({
      accent_color: 0x8b0000,
      components: [{ content: '# Stream Info' }],
    });
    expect(getComponents()[1]).toMatchObject({
      components: [{ emoji: { name: '📊' } }, { url: 'https://example.com' }],
    });
    expect(db.deleteSeasonalMessageEffect).toHaveBeenCalledWith('restart');
  });
  it('runs the button effect even when the command reply did not receive a title eye', async () => {
    const { message, getComponents } = makeMessage('regular', '# Stream Info');
    await trackSeasonalMessageEffects(
      message as unknown as Message,
      halloween(),
    );
    await vi.advanceTimersByTimeAsync(15000);
    expect(getComponents()[1]).toMatchObject({
      components: [
        { emoji: { id: '1558676165785419866' } },
        { url: 'https://example.com' },
      ],
    });
    expect(getComponents()[0]).toMatchObject({
      components: [{ content: '# Stream Info' }],
    });
  });
});
