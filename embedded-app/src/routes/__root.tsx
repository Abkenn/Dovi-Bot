import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { LayoutGroup, MotionConfig } from 'motion/react';
import { type ReactNode, ViewTransition } from 'react';
import {
  ActivityErrorState,
  ActivityLoadingState,
} from '@/components/activity-state';
import { useDiscordSdk } from '@/hooks/use-discord-sdk';
import { getLiveStats } from '@/live-stats.functions';
import appCss from '../index.css?url';

export const Route = createRootRoute({
  loader: () => getLiveStats(),
  pendingComponent: ActivityLoadingState,
  errorComponent: ({ error }) => (
    <ActivityErrorState
      message={error.message || 'Live stats are unavailable.'}
    />
  ),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { name: 'theme-color', content: '#09090f' },
      { title: 'Dovi Live Stats' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { discordClientId } = Route.useLoaderData();
  useDiscordSdk(discordClientId);

  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <MotionConfig
          reducedMotion="user"
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <LayoutGroup id="game-stats-navigation">
            <ViewTransition>{children}</ViewTransition>
          </LayoutGroup>
        </MotionConfig>
        <Scripts />
      </body>
    </html>
  );
}
