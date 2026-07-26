import { Activity } from 'lucide-react';
import { useEffect } from 'react';
import { CenteredShell } from './centered-shell';

const ERROR_RETRY_DELAY_MS = 5_000;

type ActivityErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export const ActivityErrorState = ({
  message,
  onRetry,
}: ActivityErrorStateProps) => {
  useEffect(() => {
    if (!onRetry) {
      return;
    }

    const timeout = window.setTimeout(onRetry, ERROR_RETRY_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [onRetry]);

  return (
    <CenteredShell>
      <Activity className="size-10 text-primary" aria-hidden="true" />
      <p className="text-xs font-bold tracking-[0.24em] text-primary uppercase">
        Dovi
      </p>
      <h1 className="text-3xl font-bold tracking-tight">Stats are resting</h1>
      <p className="text-muted-foreground">{message}</p>
      {onRetry ? (
        <p className="text-muted-foreground text-sm">
          Retrying automatically...
        </p>
      ) : null}
    </CenteredShell>
  );
};
