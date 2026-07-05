import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  advanceReactionEchoCounter: vi.fn(),
}));

vi.mock('../../src/data/queries/reaction-echo', () => data);
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { STAGING_ENV: 'staging', PROD_ENV: 'prod' },
}));

import { TRACKABLE_REACTION_ECHOES } from '../../src/modules/reaction-echo/reaction-echo.config';
import { processReactionEchoMessage } from '../../src/modules/reaction-echo/reaction-echo.service';
import type { ReactionEchoRule } from '../../src/modules/reaction-echo/reaction-echo.types';

const choccyMilkRule = {
  id: 'choccy-milk-sticker',
  guildIds: ['prod'],
  trigger: { kind: 'STICKER', stickerId: 'choccy' },
  response: { kind: 'STICKER', stickerId: 'choccy' },
  threshold: 20,
} as const satisfies ReactionEchoRule;

describe('reaction echo service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('echoes the Dovi emoji every 20 matching uses', () => {
    expect(TRACKABLE_REACTION_ECHOES.doviEmoji.threshold).toBe(20);
  });

  it('ignores bot messages and messages that do not match a rule', async () => {
    const sendSticker = vi.fn();

    await processReactionEchoMessage({
      message: {
        guildId: 'prod',
        channelId: 'general',
        authorIsBot: true,
        content: '',
        stickerIds: ['choccy'],
        sendSticker,
        addReaction: vi.fn(),
      },
      rules: [choccyMilkRule],
    });
    await processReactionEchoMessage({
      message: {
        guildId: 'prod',
        channelId: 'general',
        authorIsBot: false,
        content: '',
        stickerIds: ['another-sticker'],
        sendSticker,
        addReaction: vi.fn(),
      },
      rules: [choccyMilkRule],
    });

    expect(data.advanceReactionEchoCounter).not.toHaveBeenCalled();
    expect(sendSticker).not.toHaveBeenCalled();
  });

  it('echoes the sticker only when the durable counter reaches the interval', async () => {
    const sendSticker = vi.fn();
    data.advanceReactionEchoCounter
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const message = {
      guildId: 'prod',
      channelId: 'general',
      authorIsBot: false,
      content: '',
      stickerIds: ['choccy'],
      sendSticker,
      addReaction: vi.fn(),
    };

    await processReactionEchoMessage({ message, rules: [choccyMilkRule] });
    await processReactionEchoMessage({ message, rules: [choccyMilkRule] });
    await processReactionEchoMessage({ message, rules: [choccyMilkRule] });

    expect(data.advanceReactionEchoCounter).toHaveBeenCalledTimes(3);
    expect(data.advanceReactionEchoCounter).toHaveBeenCalledWith({
      ruleId: 'choccy-milk-sticker',
      every: 20,
      incrementBy: 1,
    });
    expect(sendSticker).toHaveBeenCalledOnce();
    expect(sendSticker).toHaveBeenCalledWith('choccy');
  });

  it('counts each matching message once and supports channel-scoped reaction rules', async () => {
    const addReaction = vi.fn();
    data.advanceReactionEchoCounter.mockResolvedValue(true);
    const emojiRule = {
      id: 'wave-emoji',
      guildIds: ['prod'],
      channelIds: ['general'],
      trigger: { kind: 'CUSTOM_EMOJI', emojiId: '123' },
      response: { kind: 'REACTION', emojiId: '123' },
      threshold: 40,
    } as const satisfies ReactionEchoRule;

    await processReactionEchoMessage({
      message: {
        guildId: 'prod',
        channelId: 'general',
        authorIsBot: false,
        content: 'hello <:wave:123> <:wave:123>',
        stickerIds: [],
        sendSticker: vi.fn(),
        addReaction,
      },
      rules: [emojiRule],
    });

    expect(data.advanceReactionEchoCounter).toHaveBeenCalledWith({
      ruleId: 'wave-emoji',
      every: 40,
      incrementBy: 1,
    });
    expect(addReaction).toHaveBeenCalledWith('123');
  });
});
