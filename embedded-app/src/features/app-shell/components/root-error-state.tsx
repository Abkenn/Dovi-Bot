import { ActivityErrorState } from '@/components/activity-state';
import { reloadActivity } from '@/hooks/use-deployment-recovery';

const retryActivity = () => reloadActivity(`retry-${Date.now()}`);

export const RootErrorState = () => (
  <ActivityErrorState
    message="A new version may be waking up."
    onRetry={retryActivity}
  />
);
