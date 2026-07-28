const formatMetricDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

type BossMetricsProps = {
  attempts: number;
  averageAttemptSeconds: number | null;
  winningAttemptSeconds: number | null;
};

export const BossMetrics = ({
  attempts,
  averageAttemptSeconds,
  winningAttemptSeconds,
}: BossMetricsProps) => (
  <p className="text-muted-foreground text-xs sm:text-sm">
    {attempts} attempts
    {averageAttemptSeconds === null
      ? null
      : ` · ${formatMetricDuration(averageAttemptSeconds)} avg`}
    {winningAttemptSeconds === null
      ? null
      : ` · ${formatMetricDuration(winningAttemptSeconds)} win`}
  </p>
);
