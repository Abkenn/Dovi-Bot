import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDoviApi } from '../../src/lib/api';

type EchoResponse = {
  method: string;
  url: string;
  body: string;
  contentType?: string;
};
const requests: string[] = [];
let onWaiting: (() => void) | undefined;
const server = createServer(async (request, response) => {
  requests.push(request.url ?? '');
  if (request.url === '/wait') {
    onWaiting?.();
    return;
  }
  if (request.url === '/failure') {
    response.writeHead(503).end('Unavailable');
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  response.setHeader('Content-Type', 'application/json');
  response.end(
    JSON.stringify({
      method: request.method,
      url: request.url,
      body: Buffer.concat(chunks).toString(),
      contentType: request.headers['content-type'],
    }),
  );
});
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing server port');
  baseUrl = `http://127.0.0.1:${address.port}/`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('Ky API transport integration', () => {
  it('resolves provider paths and encodes query parameters', async () => {
    const providerApi = createDoviApi(baseUrl);
    const response = await providerApi
      .get<EchoResponse>('search', {
        searchParams: { term: 'a & b', page: 2 },
      })
      .json();
    expect(response).toMatchObject({
      method: 'GET',
      url: '/search?term=a+%26+b&page=2',
      body: '',
    });
  });

  it('serializes typed JSON bodies and content headers', async () => {
    const body: { content: string } = { content: 'hello' };
    const response = await createDoviApi(baseUrl)
      .post<EchoResponse>('message', { json: body })
      .json();
    expect(response).toMatchObject({
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  it('returns error statuses to callers without automatic retries', async () => {
    const response = await createDoviApi(baseUrl).get<string>('failure');
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Unavailable');
    expect(requests.filter((url) => url === '/failure')).toHaveLength(1);
  });

  it('aborts an in-flight request when the caller cancels', async () => {
    const controller = new AbortController();
    const waiting = new Promise<void>((resolve) => {
      onWaiting = resolve;
    });
    const response = createDoviApi(baseUrl).get<string>('wait', {
      signal: controller.signal,
    });
    const assertion = expect(response).rejects.toMatchObject({
      name: 'AbortError',
    });
    await waiting;
    controller.abort();
    await assertion;
    expect(requests.filter((url) => url === '/wait')).toHaveLength(1);
  });
});
