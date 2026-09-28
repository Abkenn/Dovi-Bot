import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDaviBossStatsSpreadsheetRows } from '../../src/modules/boss-encounter-stats/sync/davi-boss-stats-spreadsheet';
import { getRequest } from '../shared/http';

afterEach(() => vi.unstubAllGlobals());

describe('spreadsheet HTTP import', () => {
  it('requests the selected sheet as CSV and preserves quoted fields and blank-row termination', async () => {
    const csv = [
      'title',
      'headers',
      '"Game, one","Boss ""Two""",4,10,2,3',
      'Game,Boss,5,11,3,4',
      '',
      'ignored,ignored',
    ].join('\r\n');
    const fetch = vi.fn().mockResolvedValue(new Response(csv));
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    await expect(
      fetchDaviBossStatsSpreadsheetRows({
        spreadsheetUrl:
          'https://docs.google.com/spreadsheets/d/sheet-id/edit?gid=42',
        signal: controller.signal,
      }),
    ).resolves.toEqual([
      {
        rowNumber: 3,
        game: 'Game, one',
        boss: 'Boss "Two"',
        deaths: '4',
        totalAttemptTime: '10',
        winningAttemptTime: '2',
        difficultyCoefficient: '3',
      },
      {
        rowNumber: 4,
        game: 'Game',
        boss: 'Boss',
        deaths: '5',
        totalAttemptTime: '11',
        winningAttemptTime: '3',
        difficultyCoefficient: '4',
      },
    ]);
    const request = getRequest(fetch.mock.calls[0]?.[0]);
    expect(request.url).toBe(
      'https://docs.google.com/spreadsheets/d/sheet-id/export?format=csv&gid=42',
    );
  });

  it('accepts an unselected sheet with partial trailing rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('title\nheaders\nGame\n,Boss')),
    );
    await expect(
      fetchDaviBossStatsSpreadsheetRows({
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-id/edit',
      }),
    ).resolves.toEqual([
      {
        rowNumber: 3,
        game: 'Game',
        boss: '',
        deaths: '',
        totalAttemptTime: '',
        winningAttemptTime: '',
        difficultyCoefficient: '',
      },
      {
        rowNumber: 4,
        game: '',
        boss: 'Boss',
        deaths: '',
        totalAttemptTime: '',
        winningAttemptTime: '',
        difficultyCoefficient: '',
      },
    ]);
  });

  it('preserves spreadsheet HTTP errors without retrying', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('', { status: 503, statusText: 'Unavailable' }),
      );
    vi.stubGlobal('fetch', fetch);
    await expect(
      fetchDaviBossStatsSpreadsheetRows({
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-id/edit',
      }),
    ).rejects.toThrow(
      'Failed to fetch Davi boss stats spreadsheet: 503 Unavailable',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing spreadsheet id before making a request', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      fetchDaviBossStatsSpreadsheetRows({
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/',
      }),
    ).rejects.toThrow('must be a Google Sheet URL');
    expect(fetch).not.toHaveBeenCalled();
  });
});
