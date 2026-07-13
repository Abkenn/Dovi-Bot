/* v8 ignore file -- the Node worker boundary is verified by the memory probe */
import { Worker } from 'node:worker_threads';
import type {
  EmbeddedAppSsrWorker,
  EmbeddedAppWorkerRequest,
  EmbeddedAppWorkerResponse,
} from './tanstack-start-server';

export const createEmbeddedAppSsrWorker = (): EmbeddedAppSsrWorker => {
  const worker = new Worker(
    new URL('../../embedded-app/ssr-worker.mjs', import.meta.url),
    {
      execArgv: [],
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
      },
    },
  );

  return {
    postMessage: (message: EmbeddedAppWorkerRequest) =>
      worker.postMessage(message),
    onMessage: (listener: (message: EmbeddedAppWorkerResponse) => void) =>
      worker.on('message', listener),
    onError: (listener: (error: Error) => void) => worker.on('error', listener),
    onExit: (listener: (code: number) => void) => worker.on('exit', listener),
    terminate: () => {
      void worker.terminate();
    },
  };
};
