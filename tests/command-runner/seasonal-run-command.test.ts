import { type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSeasonalTheme } from '../../src/config/seasonal-themes';

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { STAGING_ENV: 'staging', PROD_ENV: 'prod' },
}));
vi.mock('../../src/config/discord-command-metadata', () => ({
  HELP_COMMANDS: [],
}));
vi.mock('../../src/modules/command-logging/command-logging.service', () => ({
  createCommandExecutionLog: vi.fn(),
  createCommandErrorLog: vi.fn(),
}));
vi.mock('../../src/modules/discord/component-lifecycle', () => ({
  trackComponentMessage: vi.fn(),
}));
vi.mock('../../src/modules/command-runner/seasonal-theme.service', () => ({
  getBotSeasonalTheme: vi.fn(async () => getSeasonalTheme('halloween')),
}));
vi.mock('../../src/modules/command-runner/seasonal-message-effects', () => ({
  trackSeasonalMessageEffects: vi.fn(async () => undefined),
}));

import { runCommand } from '../../src/modules/command-runner/run-command';
import { trackSeasonalMessageEffects } from '../../src/modules/command-runner/seasonal-message-effects';
import { getBotSeasonalTheme } from '../../src/modules/command-runner/seasonal-theme.service';

afterEach(() => vi.useRealTimers());

const interactionFor = (
  userId: string,
  channelId: string,
  ephemeral = false,
) => ({
  guildId: 'prod',
  channelId,
  user: { id: userId },
  ephemeral,
  deferred: true,
  replied: false,
  editReply: vi.fn(),
});

describe('seasonal command runner integration', () => {
  it('tracks delivered Halloween replies even when a repeat gets the normal accent', async () => {
    vi.mocked(trackSeasonalMessageEffects).mockClear();
    for (const id of ['creepy', 'repeat-normal']) {
      const interaction = interactionFor('a', 'timed-effects');
      const delivered = { id };
      interaction.editReply.mockResolvedValue(delivered);
      await runCommand({
        interaction: interaction as unknown as ChatInputCommandInteraction,
        commandName: 'streaminfo',
        withCommandLogging: false,
        run: ({ editReply }) =>
          editReply({ embeds: [new EmbedBuilder().setTitle('Stream Info')] }),
      });
      expect(trackSeasonalMessageEffects).toHaveBeenLastCalledWith(
        delivered,
        '<a:eye:1558676165785419866>',
      );
    }
    expect(trackSeasonalMessageEffects).toHaveBeenCalledTimes(2);
  });
  it('does not send a late themed reply when loading settings times out', async () => {
    vi.useFakeTimers();
    const interaction = interactionFor('a', 'timeout');
    let resolveTheme:
      | ((theme: ReturnType<typeof getSeasonalTheme>) => void)
      | undefined;
    const setting = new Promise<ReturnType<typeof getSeasonalTheme>>(
      (resolve) => {
        resolveTheme = resolve;
      },
    );
    vi.mocked(getBotSeasonalTheme).mockReturnValueOnce(setting);
    const command = runCommand({
      interaction: interaction as unknown as ChatInputCommandInteraction,
      commandName: 'streaminfo',
      withCommandLogging: false,
      timeoutMs: 10,
      run: ({ editReply }) =>
        editReply({ embeds: [new EmbedBuilder().setTitle('Stream Info')] }),
    });
    await vi.advanceTimersByTimeAsync(10);
    await command;
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
    expect(interaction.editReply.mock.calls[0]?.[0].content).toContain('eepy');
    resolveTheme?.(getSeasonalTheme('halloween'));
    await vi.advanceTimersByTimeAsync(1);
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
  });

  it('themes the shared output path using the requested user pattern', async () => {
    const colors = [];
    for (const user of ['a', 'a', 'a', 'b', 'c']) {
      const interaction = interactionFor(user, 'embed-sequence');
      await runCommand({
        interaction: interaction as unknown as ChatInputCommandInteraction,
        commandName: 'streaminfo',
        withCommandLogging: false,
        run: ({ editReply }) =>
          editReply({
            embeds: [
              new EmbedBuilder().setTitle('Stream Info').setColor(0xff3131),
            ],
          }),
      });
      colors.push(
        interaction.editReply.mock.calls[0]?.[0].components[0].accentColor,
      );
    }
    expect(colors).toEqual([0x8b0000, 0xff3131, 0xff3131, 0x8b0000, 0xff3131]);
  });

  it('prefixes the fifth eligible music-search reply, including a no-match result', async () => {
    const replies = [];
    for (const user of ['a', 'b', 'c', 'd', 'e']) {
      const interaction = interactionFor(user, 'text-sequence');
      await runCommand({
        interaction: interaction as unknown as ChatInputCommandInteraction,
        commandName: 'music-search',
        withCommandLogging: false,
        run: ({ editReply }) =>
          editReply({
            content:
              'No matching tracks found. Try part of the song or game name.',
          }),
      });
      replies.push(interaction.editReply.mock.calls[0]?.[0].content);
    }
    expect(replies[4]).toBe(
      '<a:eye:1558676165785419866> No matching tracks found. Try part of the song or game name.',
    );
    expect(replies.slice(0, 4)).toEqual(
      Array(4).fill(
        'No matching tracks found. Try part of the song or game name.',
      ),
    );
  });

  it('does not theme private replies or announcement management', async () => {
    for (const [name, privateReply] of [
      ['streaminfo', true],
      ['davi-update-announcement', false],
      ['staging-announce', false],
    ] as const) {
      const interaction = interactionFor('a', `excluded-${name}`, privateReply);
      await runCommand({
        interaction: interaction as unknown as ChatInputCommandInteraction,
        commandName: name,
        withCommandLogging: false,
        run: ({ editReply }) =>
          editReply({
            embeds: [
              new EmbedBuilder().setTitle('Stream Info').setColor(0xff3131),
            ],
          }),
      });
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          components: [expect.objectContaining({ accentColor: 0xff3131 })],
        }),
      );
    }
  });

  it('reuses one theme decision for repeated edits within one command', async () => {
    const interaction = interactionFor('a', 'multi-edit');
    await runCommand({
      interaction: interaction as unknown as ChatInputCommandInteraction,
      commandName: 'streaminfo',
      withCommandLogging: false,
      run: async ({ editReply }) => {
        await editReply({
          embeds: [new EmbedBuilder().setTitle('Loading').setColor(0xff3131)],
        });
        return editReply({
          embeds: [
            new EmbedBuilder().setTitle('Stream Info').setColor(0xff3131),
          ],
        });
      },
    });
    for (const [reply] of interaction.editReply.mock.calls)
      expect(reply.components[0]).toMatchObject({ accentColor: 0x8b0000 });
  });
});
