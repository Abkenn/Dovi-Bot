import type { SapphireClient } from '@sapphire/framework';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequest } from '../shared/http';

const env = vi.hoisted(() => ({
  DEPLOYMENT_NOTIFY_USER_ID: 'recipient',
  DISCORD_TOKEN: 'test-token',
  DEPLOYMENT_CHANGELOG_GITHUB_TOKEN: '',
  KOYEB_GIT_REPOSITORY: '',
  KOYEB_GIT_SHA: 'current',
  KOYEB_GIT_COMMIT_MESSAGE: 'Fallback title\nBody',
}));
vi.mock('@zod-schemas/env.zod', () => ({ env }));

const makeClient = () => {
  const send = vi.fn().mockResolvedValue(undefined);
  const fetchUser = vi.fn().mockResolvedValue({ send });
  return {
    client: { users: { fetch: fetchUser } } as unknown as SapphireClient,
    send,
    fetchUser,
  };
};

beforeEach(() => {
  vi.resetModules();
  Object.assign(env, {
    DEPLOYMENT_NOTIFY_USER_ID: 'recipient',
    DEPLOYMENT_CHANGELOG_GITHUB_TOKEN: '',
    KOYEB_GIT_REPOSITORY: '',
    KOYEB_GIT_SHA: 'current',
    KOYEB_GIT_COMMIT_MESSAGE: 'Fallback title\nBody',
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('deployment notification HTTP requests', () => {
  it('sends typed Discord JSON bodies once with the bot authorization', async () => {
    const bodies: unknown[] = [];
    const fetch = vi.fn(async (request: Request) => {
      bodies.push(await request.json());
      return Response.json({ id: 'dm-channel' });
    });
    vi.stubGlobal('fetch', fetch);
    const { notifyDeploymentFailed } = await import(
      '../../src/app/deployment-notifications'
    );
    await notifyDeploymentFailed(new Error('startup failed'));
    await notifyDeploymentFailed(new Error('duplicate'));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(bodies).toEqual([
      { recipient_id: 'recipient' },
      { content: expect.stringContaining('Error: startup failed') },
    ]);
    const request = getRequest(fetch.mock.calls[1]?.[0]);
    expect(request.url).toBe(
      'https://discord.com/api/v10/channels/dm-channel/messages',
    );
    expect(request.method).toBe('POST');
    expect(request.headers.get('authorization')).toBe('Bot test-token');
  });

  it.each([
    {},
    { id: 123 },
  ])('rejects invalid Discord channel responses %j', async (body) => {
    const fetch = vi.fn().mockResolvedValue(Response.json(body));
    vi.stubGlobal('fetch', fetch);
    const { notifyDeploymentFailed } = await import(
      '../../src/app/deployment-notifications'
    );
    await expect(notifyDeploymentFailed('error')).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    'channel',
    'message',
  ])('preserves Discord %s failures without retrying', async (step) => {
    const fetch = vi.fn();
    if (step === 'message')
      fetch.mockResolvedValueOnce(Response.json({ id: 'channel' }));
    fetch.mockResolvedValue(
      new Response('', { status: 503, statusText: 'Unavailable' }),
    );
    vi.stubGlobal('fetch', fetch);
    const { notifyDeploymentFailed } = await import(
      '../../src/app/deployment-notifications'
    );
    await expect(notifyDeploymentFailed('error')).rejects.toThrow(
      '503 Unavailable',
    );
    expect(fetch).toHaveBeenCalledTimes(step === 'message' ? 2 : 1);
  });

  it('validates the GitHub comparison and caches commit titles for notifications', async () => {
    env.KOYEB_GIT_REPOSITORY = 'git@github.com:owner/repo.git';
    env.DEPLOYMENT_CHANGELOG_GITHUB_TOKEN = 'github-token';
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json([{}, { sha: 'current' }, { sha: 'previous' }]),
      )
      .mockResolvedValueOnce(
        Response.json({
          commits: [
            { commit: { message: 'First\nDetails' } },
            {},
            { commit: { message: 'Second' } },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetch);
    const { notifyDeploymentReady } = await import(
      '../../src/app/deployment-notifications'
    );
    const { client, send } = makeClient();
    await notifyDeploymentReady(client);
    await notifyDeploymentReady(client);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      getRequest(fetch.mock.calls[0]?.[0]).headers.get('authorization'),
    ).toBe('Bearer github-token');
    expect(getRequest(fetch.mock.calls[1]?.[0]).url).toBe(
      'https://api.github.com/repos/owner/repo/compare/previous...current',
    );
    expect(send).toHaveBeenCalledWith(
      expect.stringContaining('Changelog:\n- First\n- Second'),
    );
  });

  it('rejects a malformed GitHub deployment before comparing it', async () => {
    env.KOYEB_GIT_REPOSITORY = 'https://github.com/owner/repo';
    const fetch = vi.fn().mockResolvedValue(Response.json([{ sha: 123 }]));
    vi.stubGlobal('fetch', fetch);
    const { notifyDeploymentReady } = await import(
      '../../src/app/deployment-notifications'
    );
    const { client, send } = makeClient();
    await expect(notifyDeploymentReady(client)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    'http',
    'no-previous',
    'empty-compare',
  ])('keeps the fallback changelog for %s', async (scenario) => {
    env.KOYEB_GIT_REPOSITORY = 'https://github.com/owner/repo';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetch = vi.fn();
    if (scenario === 'http')
      fetch.mockResolvedValueOnce(new Response('', { status: 403 }));
    else if (scenario === 'no-previous')
      fetch.mockResolvedValueOnce(Response.json([]));
    else
      fetch
        .mockResolvedValueOnce(Response.json([{ sha: 'previous' }]))
        .mockResolvedValueOnce(Response.json({}));
    vi.stubGlobal('fetch', fetch);
    const { notifyDeploymentReady } = await import(
      '../../src/app/deployment-notifications'
    );
    const { client, send } = makeClient();
    await notifyDeploymentReady(client);
    expect(send).toHaveBeenCalledWith(
      expect.stringContaining('Changelog: Fallback title'),
    );
  });

  it.each([
    '',
    ' ',
    'x'.repeat(2100),
  ])('formats missing, blank, or long fallback titles', async (title) => {
    env.KOYEB_GIT_REPOSITORY = 'invalid';
    env.KOYEB_GIT_COMMIT_MESSAGE = title;
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { notifyDeploymentReady } = await import(
      '../../src/app/deployment-notifications'
    );
    const { client, send } = makeClient();
    await notifyDeploymentReady(client);
    expect(fetch).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledOnce();
    const content: unknown = send.mock.calls[0]?.[0];
    expect(typeof content).toBe('string');
    if (typeof content === 'string')
      expect(content.length).toBeLessThanOrEqual(2000);
  });

  it('skips both notification paths without a recipient', async () => {
    env.DEPLOYMENT_NOTIFY_USER_ID = '';
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { notifyDeploymentFailed, notifyDeploymentReady } = await import(
      '../../src/app/deployment-notifications'
    );
    const { client, fetchUser } = makeClient();
    await notifyDeploymentFailed('error');
    await notifyDeploymentReady(client);
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchUser).not.toHaveBeenCalled();
  });
});
