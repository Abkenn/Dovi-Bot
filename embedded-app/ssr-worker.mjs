import { AsyncLocalStorage } from 'node:async_hooks';
import { parentPort } from 'node:worker_threads';
import serverEntry from './dist/server/index.js';

if (!parentPort) {
  throw new Error('The embedded app SSR worker requires a parent port.');
}

const statsContext = new AsyncLocalStorage();

globalThis.__doviEmbeddedAppStatsLoader = async () => {
  const stats = statsContext.getStore();

  if (!stats) {
    throw new Error('The embedded app stats payload is unavailable.');
  }

  return stats;
};

parentPort.on('message', (message) => {
  void statsContext.run(message.stats, async () => {
    try {
      const requestInit = {
        method: message.request.method,
        headers: message.request.headers,
      };

      if (message.request.body) {
        requestInit.body = message.request.body;
      }

      const response = await serverEntry.fetch(
        new Request(message.request.url, requestInit),
      );
      const body = await response.arrayBuffer();

      parentPort.postMessage({
        id: message.id,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: [...response.headers.entries()],
          body,
        },
      });
    } catch (error) {
      parentPort.postMessage({
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
});
