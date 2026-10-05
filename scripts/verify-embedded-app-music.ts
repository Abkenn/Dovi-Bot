import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { chromium } from '@playwright/test';
import { Hono } from 'hono';
import type {
  EmbeddedAppWorkerRequest,
  EmbeddedAppWorkerResponse,
} from '../src/app/tanstack-start-server';
import type { EmbeddedAppStats } from '../src/modules/embedded-app/embedded-app-stats.types';
import type {
  MusicFactsResponse,
  MusicSearchResponse,
} from '../src/modules/music/music.types';
import { encodeMusicActivityTarget } from '../src/modules/music/music-activity-target';

const output = path.resolve('.local/embedded-app-music');
await mkdir(path.join(output, 'browser-temp'), { recursive: true });
process.env.TEMP = path.join(output, 'browser-temp');
process.env.TMP = process.env.TEMP;
const stats: EmbeddedAppStats = {
  game: null,
  currentBoss: null,
  lastKilledBoss: null,
  currentStreamWindow: null,
  streamEncounters: [],
  bosses: [],
  games: [],
  generalStats: {
    games: [],
    hardestByDeathsGameId: null,
    longestWinningAttemptGameId: null,
    toughestOverallGameId: null,
  },
};
const facts: MusicFactsResponse = {
  facts: {
    track: {
      title: 'A memorable theme with a very long track title',
      count: 123,
    },
    series: { title: 'Dark Souls', count: 456 },
  },
};
const matches: MusicSearchResponse = {
  results: Array.from({ length: 21 }, (_, index) => ({
    title: `Theme ${index}`,
    game: 'Dark Souls 2',
    count: index + 1,
    date: '2026-01-01',
    offsetSeconds: 90,
    url: `https://www.youtube.com/watch?v=example&t=90s`,
  })),
};
const worker = new Worker(
  new URL('../embedded-app/ssr-worker.mjs', import.meta.url),
  { env: { ...process.env, DISCORD_CLIENT_ID: '' } },
);
const pending = new Map<
  number,
  {
    resolve: (message: EmbeddedAppWorkerResponse) => void;
    reject: (error: Error) => void;
  }
>();
worker.on('message', (message: EmbeddedAppWorkerResponse) => {
  pending.get(message.id)?.resolve(message);
  pending.delete(message.id);
});
worker.on('error', (error) => {
  for (const entry of pending.values()) entry.reject(error);
  pending.clear();
});
let nextId = 0;
const app = new Hono();
app.post('/api/music/rpc/facts', (c) => c.json({ json: facts }));
app.post('/api/music/rpc/searchPage', async (c) => {
  const body = await c.req.json<{
    json: { query: string; game: boolean; cursor: number };
  }>();
  const input = body.json;
  if (input.query === 'Error')
    return c.json(
      {
        json: {
          code: 'SERVICE_UNAVAILABLE',
          status: 503,
          message: 'Unavailable',
          defined: false,
        },
      },
      503,
    );
  const results = input.query === 'Missing' ? [] : (matches.results ?? []);
  const selected = input.game ? results : results.slice(0, 1);
  const next = input.cursor + 20;
  return c.json({
    json: {
      results: selected.slice(input.cursor, next),
      total: selected.length,
      nextCursor: next < selected.length ? next : null,
    },
  });
});
app.use('*', serveStatic({ root: './embedded-app/dist/client' }));
app.all('*', async (c) => {
  nextId += 1;
  const id = nextId;
  const result = new Promise<EmbeddedAppWorkerResponse>((resolve, reject) =>
    pending.set(id, { resolve, reject }),
  );
  const launch = new URL(c.req.url).searchParams.get('launch');
  worker.postMessage({
    id,
    request: {
      url: c.req.url,
      method: 'GET',
      headers: [...c.req.raw.headers.entries()],
      body: null,
    },
    stats: launch
      ? {
          ...stats,
          initialGameName: encodeMusicActivityTarget({
            query: 'Dark Souls',
            game: true,
          }),
        }
      : stats,
  } satisfies EmbeddedAppWorkerRequest);
  const message = await result;
  if (!message.response)
    throw new Error(message.error ?? 'Missing SSR response');
  return new Response(message.response.body, {
    status: message.response.status,
    headers: message.response.headers,
  });
});
const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 });
await new Promise<void>((resolve) => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({
  channel: process.platform === 'win32' ? 'msedge' : undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 700 },
  });
  await page.goto(`${origin}/music`);
  await page.getByText('Most played track').waitFor();
  await page.waitForFunction(
    () =>
      getComputedStyle(
        document.querySelector('.music-full > div:last-child') ?? document.body,
      ).opacity === '1',
  );
  assert.equal(await page.getByRole('link').last().innerText(), 'Music');
  await page.screenshot({ path: path.join(output, 'focused-default.png') });
  await page.getByRole('combobox').selectOption('game');
  await page.getByRole('textbox').fill('Dark Souls');
  await page.getByRole('button', { name: 'Search music' }).click();
  await page.getByText('21 tracks').waitFor();
  assert.equal(await page.getByText('Most played track').count(), 0);
  assert.equal(
    await page.getByRole('link', { name: 'Theme 20', exact: true }).count(),
    0,
  );
  await page
    .getByRole('button', { name: 'Load more tracks', exact: true })
    .scrollIntoViewIfNeeded();
  await page.getByRole('link', { name: 'Theme 20', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('link', { name: 'Theme 0', exact: true }).count(),
    1,
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'Load more tracks', exact: true })
      .count(),
    0,
  );
  await page.screenshot({ path: path.join(output, 'focused-results.png') });
  await page.getByRole('link', { name: 'Stats', exact: true }).click();
  await page.getByRole('link', { name: 'Music', exact: true }).click();
  await page.getByText('Most played track').waitFor();
  assert.equal(await page.getByRole('textbox').inputValue(), '');
  assert.equal(await page.getByRole('combobox').inputValue(), 'track');
  await page.goto(`${origin}/?launch=music`);
  await page.getByText('21 tracks').waitFor();
  assert.equal(await page.getByRole('textbox').inputValue(), 'Dark Souls');
  assert.equal(await page.getByRole('combobox').inputValue(), 'game');
  await page.getByRole('link', { name: 'Stats', exact: true }).click();
  await page.getByRole('link', { name: 'Music', exact: true }).click();
  await page.getByText('Most played track').waitFor();
  for (const size of [
    { width: 320, height: 180 },
    { width: 280, height: 160 },
    { width: 480, height: 270 },
    { width: 240, height: 135 },
  ]) {
    await page.setViewportSize(size);
    await page.evaluate(() => {
      document.documentElement.dataset.activityLayout = 'pip';
      document.documentElement.dataset.discordPlatform = 'desktop';
    });
    assert.equal(await page.locator('.music-full').isVisible(), false);
    const geometry = await page
      .locator('.music-pip-only')
      .evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          top: bounds.top,
          bottom: bounds.bottom,
          left: bounds.left,
          right: bounds.right,
          height: element.clientHeight,
          scrollHeight: element.scrollHeight,
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
        };
      });
    assert(
      geometry.top >= 0 &&
        geometry.bottom <= size.height &&
        geometry.left >= 0 &&
        geometry.right <= size.width,
      JSON.stringify(geometry),
    );
    assert(
      geometry.scrollHeight <= geometry.height + 1 &&
        geometry.scrollWidth <= geometry.width + 1 &&
        geometry.documentHeight <= size.height + 1,
      JSON.stringify(geometry),
    );
    await page.screenshot({
      path: path.join(output, `pip-${size.width}x${size.height}.png`),
    });
  }
  await page.evaluate(() => {
    document.documentElement.dataset.activityLayout = 'focused';
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('.music-pip-only').isVisible(), false);
  assert.equal(await page.getByRole('textbox').isVisible(), true);
  await page.screenshot({ path: path.join(output, 'mobile-focused.png') });
  console.log(
    'Music browser audit passed: searches, infinite scrolling, tab reset, command launch, four PiP sizes, and focused restoration.',
  );
} finally {
  await browser.close();
  await worker.terminate();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
