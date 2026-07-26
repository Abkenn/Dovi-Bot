import { motion } from 'motion/react';
import type {
  EmbeddedAppBossComparison,
  EmbeddedAppGameComparison,
} from '../../../src/modules/embedded-app/embedded-app-stats.types';

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const BossHighlight = ({
  label,
  boss,
  detail,
}: {
  label: string;
  boss: EmbeddedAppBossComparison | null;
  detail: string;
}) => (
  <div className="rounded-lg border border-border/70 bg-background/60 p-2.5">
    <p className="text-[0.6rem] font-bold tracking-[0.1em] text-muted-foreground uppercase">
      {label}
    </p>
    <p className="mt-0.5 font-semibold">{boss?.name ?? 'Timing unavailable'}</p>
    <p className="text-xs text-muted-foreground">{boss ? detail : '-'}</p>
  </div>
);

export const GameDifficultyTooltip = ({
  game,
}: {
  game: EmbeddedAppGameComparison;
}) => {
  const { mostAttempts, longestWinningAttempt, toughestOverall } =
    game.bossHighlights;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="w-64 rounded-xl border border-primary/30 bg-card/95 p-3 shadow-2xl backdrop-blur"
    >
      <p className="mb-2 font-bold">{game.name}</p>
      <div className="space-y-2">
        <BossHighlight
          label="Most attempts"
          boss={mostAttempts}
          detail={`${mostAttempts.attempts} attempts`}
        />
        <BossHighlight
          label="Longest winning attempt"
          boss={longestWinningAttempt}
          detail={
            longestWinningAttempt?.winningAttemptSeconds
              ? formatDuration(longestWinningAttempt.winningAttemptSeconds)
              : ''
          }
        />
        <BossHighlight
          label="Toughest balanced boss"
          boss={toughestOverall}
          detail={
            toughestOverall
              ? `${toughestOverall.attempts} attempts / ${
                  toughestOverall.winningAttemptSeconds
                    ? formatDuration(toughestOverall.winningAttemptSeconds)
                    : 'untimed win'
                }`
              : ''
          }
        />
      </div>
    </motion.div>
  );
};
