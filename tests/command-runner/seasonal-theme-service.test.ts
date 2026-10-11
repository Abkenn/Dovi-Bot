import { beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({
  findSeasonalThemeMode: vi.fn(),
  saveSeasonalThemeMode: vi.fn(),
}));
vi.mock('@data/queries/seasonal-theme', () => queries);
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: { STAGING_ENV: 'staging' },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  queries.findSeasonalThemeMode.mockResolvedValue('auto');
  queries.saveSeasonalThemeMode.mockResolvedValue({
    seasonalThemeMode: 'halloween',
  });
});

describe('persistent bot theme', () => {
  it('loads the staging setting once for bot-wide replies', async () => {
    const service = await import(
      '../../src/modules/command-runner/seasonal-theme.service'
    );
    expect(await service.getBotThemeMode()).toBe('auto');
    expect(await service.getBotThemeMode()).toBe('auto');
    expect(queries.findSeasonalThemeMode).toHaveBeenCalledExactlyOnceWith(
      'staging',
    );
  });

  it('applies saved overrides immediately and supports automatic and normal modes', async () => {
    const service = await import(
      '../../src/modules/command-runner/seasonal-theme.service'
    );
    await service.setBotThemeMode('halloween');
    expect((await service.getBotSeasonalTheme())?.id).toBe('halloween');
    expect(queries.saveSeasonalThemeMode).toHaveBeenCalledWith(
      'staging',
      'halloween',
    );
    await service.setBotThemeMode('normal');
    expect(await service.getBotSeasonalTheme()).toBeNull();
    await service.setBotThemeMode('auto');
    expect(await service.getBotThemeMode()).toBe('auto');
  });

  it('rejects unknown and unfinished holiday themes without writing', async () => {
    const service = await import(
      '../../src/modules/command-runner/seasonal-theme.service'
    );
    for (const mode of ['christmas', 'easter', 'unknown', 'toString'])
      await expect(service.setBotThemeMode(mode)).rejects.toThrow();
    expect(queries.saveSeasonalThemeMode).not.toHaveBeenCalled();
  });

  it('lets ordinary commands keep their normal appearance during a settings failure', async () => {
    const service = await import(
      '../../src/modules/command-runner/seasonal-theme.service'
    );
    queries.findSeasonalThemeMode.mockRejectedValueOnce(new Error('Offline'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await service.getBotSeasonalTheme()).toBeNull();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('retries failed reads and preserves the previous mode when a write fails', async () => {
    const service = await import(
      '../../src/modules/command-runner/seasonal-theme.service'
    );
    queries.findSeasonalThemeMode.mockRejectedValueOnce(new Error('Offline'));
    await expect(service.getBotThemeMode()).rejects.toThrow('Offline');
    expect(await service.getBotThemeMode()).toBe('auto');
    queries.saveSeasonalThemeMode.mockRejectedValueOnce(new Error('Offline'));
    await expect(service.setBotThemeMode('normal')).rejects.toThrow('Offline');
    expect(await service.getBotThemeMode()).toBe('auto');
  });
});
