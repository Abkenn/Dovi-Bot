type CurrentBossStatProps = {
  value: string | number;
  label: string;
};

export const CurrentBossStat = ({ value, label }: CurrentBossStatProps) => (
  <div className="space-y-1">
    <strong className="block text-2xl font-bold tracking-tight sm:text-4xl">
      {value}
    </strong>
    <span className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.14em] uppercase">
      {label}
    </span>
  </div>
);
