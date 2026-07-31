import { describe, expect, it } from 'vitest';
import { shouldRunDalTests } from '../../scripts/hooks/pre-push-paths.mjs';

describe('pre-push DAL test selection', () => {
  it.each([
    'src/data/queries/stream-info.ts',
    'src/data/transactions/boss-tracking.ts',
    'src/lib/prisma.ts',
    'prisma/schema.prisma',
    'prisma.config.ts',
    'tests/dal/dal-integration.spec.ts',
    'playwright.dal.config.ts',
  ])('requires DAL tests when %s changes', (path) => {
    expect(shouldRunDalTests([path])).toBe(true);
  });

  it('skips DAL tests for command and presentation-only changes', () => {
    expect(
      shouldRunDalTests([
        'src/commands/setstreaminfo.ts',
        'src/modules/stream-info/stream-info.discord.ts',
        'tests/stream-info/stream-info-discord.test.ts',
      ]),
    ).toBe(false);
  });
});
