import { createFileRoute } from '@tanstack/react-router';

const handleMusicRequest = async ({ request }: { request: Request }) => {
  const { createMusicApi } = await import('../../../src/app/music-api');
  const url = new URL(request.url);
  url.pathname = url.pathname.slice('/api/music'.length);
  return createMusicApi().fetch(new Request(url, request));
};

export const Route = createFileRoute('/api/music/$')({
  server: { handlers: { GET: handleMusicRequest, POST: handleMusicRequest } },
});
