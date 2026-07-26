import { useEffect, useRef } from 'react';

type ReloadActivity = (deploymentVersion: string) => void;

type ActivityLocation = {
  href: string;
  replace: (url: string) => void;
};

type ActivityFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok'>>;

export const reloadActivity = (
  deploymentVersion: string,
  location: ActivityLocation = window.location,
) => {
  const url = new URL(location.href);
  url.searchParams.set('dovi_deployment', deploymentVersion);
  location.replace(url.toString());
};

export const reloadActivityWhenAvailable = async (
  deploymentVersion: string,
  activityFetch: ActivityFetch = fetch,
  location: ActivityLocation = window.location,
) => {
  const response = await activityFetch(location.href, {
    cache: 'no-store',
    headers: { 'x-dovi-deployment-probe': 'true' },
  });

  if (response.ok) {
    reloadActivity(deploymentVersion, location);
  }
};

export const useDeploymentRecovery = (
  deploymentVersion: string,
  reload: ReloadActivity = reloadActivity,
) => {
  const initialVersion = useRef(deploymentVersion);
  const deploymentChanged = initialVersion.current !== deploymentVersion;

  useEffect(() => {
    if (deploymentChanged) {
      reload(deploymentVersion);
    }
  }, [deploymentChanged, deploymentVersion, reload]);

  return deploymentChanged;
};
