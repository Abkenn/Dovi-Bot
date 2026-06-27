import { describe, expect, it } from 'vitest';
import {
  COMMAND_ACCESSES,
  evaluateCommandAccess,
  PROD_MEMBER_ROLE_ID,
} from '../../src/config/discord-command-access';

describe('Discord command access policy', () => {
  it('allows every access level in staging without roles', () => {
    expect(
      evaluateCommandAccess({
        access: COMMAND_ACCESSES.REGULAR,
        isProdGuild: false,
        roleIds: [],
        roleNames: [],
      }),
    ).toEqual({ allowed: true });
  });

  it('requires the Member role for default prod commands', () => {
    expect(
      evaluateCommandAccess({
        access: COMMAND_ACCESSES.DEFAULT,
        isProdGuild: true,
        roleIds: [],
        roleNames: [],
      }),
    ).toMatchObject({
      allowed: false,
      message: expect.stringContaining('Member role'),
      ephemeral: false,
    });
    expect(
      evaluateCommandAccess({
        access: COMMAND_ACCESSES.DEFAULT,
        isProdGuild: true,
        roleIds: [PROD_MEMBER_ROLE_ID],
        roleNames: ['Member'],
      }),
    ).toEqual({ allowed: true });
  });

  it('requires Gold 1 or a Champion role for regular prod commands', () => {
    const baseInput = {
      access: COMMAND_ACCESSES.REGULAR,
      isProdGuild: true,
      roleIds: [PROD_MEMBER_ROLE_ID],
    } as const;

    expect(
      evaluateCommandAccess({
        ...baseInput,
        roleNames: ['Member', 'Silver 3'],
      }),
    ).toMatchObject({
      allowed: false,
      message: expect.stringContaining('Gold 1'),
      ephemeral: false,
    });
    expect(
      evaluateCommandAccess({
        ...baseInput,
        roleNames: ['Member', 'Gold 1'],
      }),
    ).toEqual({ allowed: true });
    expect(
      evaluateCommandAccess({
        ...baseInput,
        roleNames: ['Member', '⭐ Gold 1 ⭐'],
      }),
    ).toEqual({ allowed: true });
    expect(
      evaluateCommandAccess({
        ...baseInput,
        roleNames: ['Member', 'Champion 3 ⭐⭐⭐', 'Bronze 2'],
      }),
    ).toEqual({ allowed: true });
    expect(
      evaluateCommandAccess({
        ...baseInput,
        roleNames: ['Member', '⭐ Champion 3 ⭐⭐⭐', 'Bronze 2'],
      }),
    ).toEqual({ allowed: true });
  });

  it('still requires Member when a non-member has a Champion role', () => {
    expect(
      evaluateCommandAccess({
        access: COMMAND_ACCESSES.REGULAR,
        isProdGuild: true,
        roleIds: [],
        roleNames: ['Champion 1 ⭐'],
      }),
    ).toMatchObject({
      allowed: false,
      message: expect.stringContaining('Member role'),
    });
  });

  it('never formats role mentions in denial messages', () => {
    const result = evaluateCommandAccess({
      access: COMMAND_ACCESSES.DEFAULT,
      isProdGuild: true,
      roleIds: [],
      roleNames: [],
    });

    expect(result).toMatchObject({ allowed: false });
    expect('message' in result ? result.message : '').not.toContain('<@&');
    expect('message' in result ? result.message : '').not.toContain(
      PROD_MEMBER_ROLE_ID,
    );
  });
});
