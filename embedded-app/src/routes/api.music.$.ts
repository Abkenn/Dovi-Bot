import { createFileRoute } from '@tanstack/react-router';

const handleMusicRequest = async ({ request }: { request: Request }) => {
  const { createMusicApi } = await import('../../../src/app/music-api');
  return createMusicApi().fetch(request);
};

export const Route = createFileRoute('/api/music/$')({
  server: { handlers: { GET: handleMusicRequest, POST: handleMusicRequest } },
});
