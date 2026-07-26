type DesktopPipAttemptStatProps = {
  value: string | number;
  label: string;
};

export const DesktopPipAttemptStat = ({
  value,
  label,
}: DesktopPipAttemptStatProps) => (
  <div className="min-w-0">
    <strong className="block truncate text-xl leading-none font-bold tabular-nums">
      {value}
    </strong>
    <span className="mt-1 block text-[0.5rem] leading-none font-semibold tracking-[0.1em] text-muted-foreground uppercase">
      {label}
    </span>
  </div>
);
