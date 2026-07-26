import { Check, Pause, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Boss } from '@/live-stats.types';

type BossOutcomeProps = {
  outcome: Boss['outcome'];
};

export const BossOutcome = ({ outcome }: BossOutcomeProps) => {
  if (outcome === 'KILLED') {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 text-emerald-400"
        aria-label="Killed"
      >
        <Check className="size-4" aria-hidden="true" />
        Killed
      </Badge>
    );
  }

  if (outcome === 'PAUSED') {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 text-amber-300"
        aria-label="Paused"
      >
        <Pause className="size-4" aria-hidden="true" />
        Paused
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-primary/30 text-primary"
      aria-label="Fighting"
    >
      <Radio className="size-4" aria-hidden="true" />
      Fighting
    </Badge>
  );
};
