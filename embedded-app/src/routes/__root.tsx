import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useNavigate,
} from '@tanstack/react-router';
import { LayoutGroup, MotionConfig } from 'motion/react';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  ActivityErrorState,
  ActivityLoadingState,
} from '@/components/activity-state';
import { useDiscordSdk } from '@/hooks/use-discord-sdk';
import { resolveActivityTargetGame } from '@/lib/activity-target';
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
  const { discordClientId, stats } = Route.useLoaderData();
  const customId = useDiscordSdk(discordClientId);
  const navigate = useNavigate();
  const handledCustomId = useRef<string | null>(null);

  useEffect(() => {
    const requestedGameName = stats.initialGameName ?? customId;

    if (!requestedGameName || handledCustomId.current === requestedGameName) {
      return;
    }

    handledCustomId.current = requestedGameName;
    const targetGame = resolveActivityTargetGame(
      stats.games,
      requestedGameName,
    );

    if (targetGame) {
      void navigate({
        to: '/games/$gameId',
        params: { gameId: targetGame.id },
        replace: true,
      });
    }
  }, [customId, navigate, stats.games, stats.initialGameName]);

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
      <body className="activity-compact:overflow-hidden">
        <MotionConfig
          reducedMotion="user"
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <LayoutGroup id="game-stats-navigation">{children}</LayoutGroup>
        </MotionConfig>
        <Scripts />
      </body>
    </html>
  );
}
