import { MessageFlags } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { buildCommandErrorReplyOptions } from '../../src/modules/command-runner/command-error-reply';

describe('command error replies', () => {
  it('builds public role denials without an ephemeral flag', () => {
    expect(
      buildCommandErrorReplyOptions('Member role required.', false),
    ).toEqual({
      content: 'Member role required.',
    });
  });

  it('keeps ordinary command errors private', () => {
    expect(buildCommandErrorReplyOptions('Command unavailable.', true)).toEqual(
      {
        content: 'Command unavailable.',
        flags: MessageFlags.Ephemeral,
      },
    );
  });
});
