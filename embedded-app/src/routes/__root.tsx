import { createRootRoute } from '@tanstack/react-router';
import { ActivityLoadingState } from '@/components/activity-state';
import { CurrentBuildContent } from '@/features/app-shell/components/current-build-content';
import { RootDocument } from '@/features/app-shell/components/root-document';
import { RootErrorState } from '@/features/app-shell/components/root-error-state';
import { useDeploymentRecovery } from '@/hooks/use-deployment-recovery';
import { getLiveStats } from '@/live-stats.functions';
import appCss from '../index.css?url';

export const Route = createRootRoute({
  loader: () => getLiveStats(),
  pendingComponent: ActivityLoadingState,
  errorComponent: RootErrorState,
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
  const { deploymentVersion, discordClientId, stats } = Route.useLoaderData();
  const deploymentChanged = useDeploymentRecovery(deploymentVersion);

  return (
    <RootDocument>
      {deploymentChanged ? (
        <ActivityLoadingState />
      ) : (
        <CurrentBuildContent discordClientId={discordClientId} stats={stats} />
      )}
    </RootDocument>
  );
}
