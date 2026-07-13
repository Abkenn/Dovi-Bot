import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const getRouter = () =>
  createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultStaleTime: 12 * 60 * 60 * 1_000,
    scrollRestoration: true,
  });

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
