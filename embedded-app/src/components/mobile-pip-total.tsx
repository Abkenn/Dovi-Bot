import { AnimatedNumber } from './animated-number';

type MobilePipTotalProps = {
  value: number;
  label: string;
  cacheKey: string;
  suffix?: string;
  fallback?: string;
};

export const MobilePipTotal = ({
  value,
  label,
  cacheKey,
  suffix,
  fallback,
}: MobilePipTotalProps) => {
  const valueSize = Math.abs(value) >= 100 ? 'text-xl' : 'text-2xl';

  return (
    <div className="min-w-0 rounded-lg border border-border bg-card/70 px-2 py-3 text-center">
      {fallback ? (
        <span className="block text-sm leading-none font-bold">{fallback}</span>
      ) : (
        <AnimatedNumber
          value={value}
          cacheKey={cacheKey}
          suffix={suffix}
          className={`${valueSize} block leading-none font-bold tabular-nums`}
        />
      )}
      <span className="mt-1.5 block text-[0.5rem] leading-tight font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
};
