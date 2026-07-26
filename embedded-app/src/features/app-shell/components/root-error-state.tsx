import { ActivityErrorState } from '@/components/activity-state';
import { reloadActivityWhenAvailable } from '@/hooks/use-deployment-recovery';

const retryActivity = () =>
  reloadActivityWhenAvailable(`retry-${Date.now()}`).catch(() => undefined);

export const RootErrorState = () => (
  <ActivityErrorState
    message="A new version may be waking up."
    onRetry={retryActivity}
  />
);
