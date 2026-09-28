import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDoviApi,
  createUptimeRobotApi,
  hltbApi,
  openCriticApi,
} from '../../src/lib/api';
import { getRequest } from '../shared/http';

afterEach(() => vi.unstubAllGlobals());

describe('provider client configuration', () => {
  it.each([
    [
      'https://status.example/page/monitor',
      'https://status.example/api/getMonitor/page?m=monitor',
    ],
    [
      'https://status.example/api/getMonitor/page?m=monitor',
      'https://status.example/api/getMonitor/page?m=monitor',
    ],
  ])('preserves the configured monitor endpoint %s', async (configuredUrl, expectedUrl) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ status: 'ok' }));
    vi.stubGlobal('fetch', fetch);
    await createUptimeRobotApi(configuredUrl).get<{ status: string }>('');
    expect(getRequest(fetch.mock.calls[0]?.[0]).url).toBe(expectedUrl);
  });

  it('preserves the configured Dovi health path and query', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ status: 'ok' }));
    vi.stubGlobal('fetch', fetch);
    await createDoviApi('https://bot.example/custom/health?probe=1').get<{
      status: string;
    }>('');
    expect(getRequest(fetch.mock.calls[0]?.[0]).url).toBe(
      'https://bot.example/custom/health?probe=1',
    );
  });

  it('merges HLTB and OpenCritic provider headers with per-request headers', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json({})));
    vi.stubGlobal('fetch', fetch);
    await hltbApi.post<object>('api/search/site', {
      headers: { 'x-auth-token': 'token' },
      json: {},
    });
    await openCriticApi.get<object>('game/1', {
      headers: { 'x-rapidapi-key': 'key' },
    });
    const hltb = getRequest(fetch.mock.calls[0]?.[0]);
    expect(hltb.headers.get('origin')).toBe('https://howlongtobeat.com');
    expect(hltb.headers.get('referer')).toBe('https://howlongtobeat.com/');
    expect(hltb.headers.get('x-auth-token')).toBe('token');
    const openCritic = getRequest(fetch.mock.calls[1]?.[0]);
    expect(openCritic.headers.get('x-rapidapi-host')).toBe(
      'opencritic-api.p.rapidapi.com',
    );
    expect(openCritic.headers.get('x-rapidapi-key')).toBe('key');
    expect(openCritic.headers.has('x-auth-token')).toBe(false);
  });
});
