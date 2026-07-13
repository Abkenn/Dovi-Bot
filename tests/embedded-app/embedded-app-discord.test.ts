import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: {
    STAGING_ENV: 'staging-guild',
    PROD_ENV: 'production-guild',
  },
}));
vi.mock('../../src/types/zod-schemas/env.zod', () => ({
  env: { DISCORD_CLIENT_ID: 'app-1' },
}));

import {
  buildEmbeddedAppStatsButton,
  parseEmbeddedAppStatsButton,
} from '../../src/modules/embedded-app/embedded-app-stats.discord';

describe('embedded app stats Discord button', () => {
  it('builds the unchanged Stats launch button for live stats', () => {
    expect(
      buildEmbeddedAppStatsButton('staging-guild')?.toJSON(),
    ).toMatchObject({
      components: [
        {
          custom_id: 'embedded-app-stats',
          label: 'Stats',
          emoji: { name: '📊' },
        },
      ],
    });
  });

  it('builds the same interactive Stats button with a game target', () => {
    expect(
      buildEmbeddedAppStatsButton('staging-guild', 'UNDERTALE')?.toJSON(),
    ).toMatchObject({
      components: [
        {
          label: 'Stats',
          emoji: { name: '📊' },
          custom_id: 'embedded-app-stats:UNDERTALE',
        },
      ],
    });
  });

  it('builds a direct Activity link in production', () => {
    expect(
      buildEmbeddedAppStatsButton('production-guild', 'Elden Ring')?.toJSON(),
    ).toMatchObject({
      components: [
        {
          label: 'Stats',
          style: 5,
          url: 'https://discord.com/activities/app-1?custom_id=Elden+Ring',
        },
      ],
    });
    expect(buildEmbeddedAppStatsButton('unknown-guild')).toBeNull();
  });

  it('parses live and targeted Stats interactions', () => {
    expect(parseEmbeddedAppStatsButton('embedded-app-stats')).toEqual({
      gameName: null,
    });
    expect(parseEmbeddedAppStatsButton('embedded-app-stats:UNDERTALE')).toEqual(
      { gameName: 'UNDERTALE' },
    );
    expect(parseEmbeddedAppStatsButton('another-button')).toBeNull();
  });

  it('falls back to a live launch when a game cannot fit the custom id', () => {
    const gameName = 'a'.repeat(100);

    expect(
      buildEmbeddedAppStatsButton('staging-guild', gameName)?.toJSON(),
    ).toMatchObject({
      components: [{ custom_id: 'embedded-app-stats' }],
    });
  });
});
