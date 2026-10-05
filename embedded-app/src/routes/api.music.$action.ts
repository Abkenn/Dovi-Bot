import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/music/$action')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { createMusicApi } = await import('../../../src/app/music-api');
        const url = new URL(request.url);
        url.pathname = url.pathname.slice('/api/music'.length);
        return createMusicApi().fetch(new Request(url, request));
      },
    },
  },
});
