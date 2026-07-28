import { BrainCircuit, Clock3, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BossAchievement } from '@/live-stats.types';

const ACHIEVEMENT_CONFIG = {
  MOST_DEATHS: {
    label: 'Most deaths',
    description: 'Highest death count in this game',
    icon: Skull,
    className: 'border-rose-500/35 bg-rose-500/10 text-rose-300',
  },
  LONGEST_WINNING_ATTEMPT: {
    label: 'Longest winning attempt',
    description: 'Longest final successful attempt in this game',
    icon: Clock3,
    className: 'border-violet-500/35 bg-violet-500/10 text-violet-300',
  },
  TOUGHEST_OVERALL: {
    label: 'Toughest overall',
    description: 'Strongest balance of deaths and winning time',
    icon: BrainCircuit,
    className: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-300',
  },
} satisfies Record<
  BossAchievement,
  {
    label: string;
    description: string;
    icon: typeof Skull;
    className: string;
  }
>;

type BossAchievementsProps = {
  achievements: BossAchievement[];
};

export const BossAchievements = ({ achievements }: BossAchievementsProps) => (
  <span className="inline-flex items-center gap-1">
    {achievements.map((achievement) => {
      const config = ACHIEVEMENT_CONFIG[achievement];
      const Icon = config.icon;

      return (
        <span key={achievement} className="group/achievement relative">
          <button
            type="button"
            aria-label={`${config.label}: ${config.description}`}
            className={cn(
              'grid size-5 cursor-help place-items-center rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60',
              config.className,
            )}
          >
            <Icon className="size-3" aria-hidden="true" />
          </button>
          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-left text-xs text-popover-foreground shadow-xl group-hover/achievement:block group-focus-within/achievement:block">
            <span className="block font-bold">{config.label}</span>
            <span className="mt-0.5 block text-muted-foreground">
              {config.description}
            </span>
          </span>
        </span>
      );
    })}
  </span>
);
