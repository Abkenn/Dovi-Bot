import { CloudOff } from 'lucide-react';

type OfflineSnapshotBannerProps = {
  cachedAt: string;
};

export const OfflineSnapshotBanner = ({
  cachedAt,
}: OfflineSnapshotBannerProps) => (
  <div className="mobile-pip-hide fixed top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-500/30 bg-card/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
    <CloudOff className="size-3.5 text-amber-400" aria-hidden="true" />
    <span className="font-semibold">Offline snapshot</span>
    <span className="text-muted-foreground">
      {new Date(cachedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  </div>
);
