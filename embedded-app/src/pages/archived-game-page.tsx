import { History, Skull, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { BossHistory } from '@/components/boss-history';
import { GameSwitcher } from '@/components/game-switcher';
import { MobilePipStats } from '@/components/mobile-pip-stats';
import { StatsPageHeader } from '@/components/stats-page-header';
import { Card, CardContent } from '@/components/ui/card';
import type { ArchivedGame } from '@/live-stats.types';

const ArchiveTotal = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <Card className="activity-compact:rounded-lg gap-0 py-0">
    <CardContent className="activity-compact:!p-2 flex items-center gap-2.5 p-3 sm:gap-4 sm:p-7">
      <span className="activity-compact:hidden grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl">
        {icon}
      </span>
      <div className="min-w-0">
        <strong className="activity-compact:!text-xl block text-2xl font-bold tracking-tight sm:text-4xl">
          {value}
        </strong>
        <span className="activity-compact:!text-[0.55rem] text-muted-foreground text-[0.6rem] leading-tight font-semibold tracking-[0.08em] uppercase sm:text-xs">
          {label}
        </span>
      </div>
    </CardContent>
  </Card>
);

export const ArchivedGamePage = ({
  game,
  games,
}: {
  game: ArchivedGame;
  games: ArchivedGame[];
}) => (
  <motion.main
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="mobile-pip-frame activity-compact:h-svh activity-compact:min-h-0 activity-compact:overflow-hidden activity-compact:!space-y-2 activity-compact:!p-3 activity-compact:flex activity-compact:flex-col activity-compact:justify-center mx-auto min-h-svh w-full max-w-5xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-8 sm:py-12"
  >
    <MobilePipStats
      gameName={game.name}
      deaths={game.deaths}
      killedBossCount={game.killedBossCount}
    />
    <StatsPageHeader
      eyebrow="Dovi Archived Stats"
      title={game.name}
      statusIcon={<History aria-hidden="true" />}
      statusLabel="Complete history"
    />
    <div className="activity-compact:hidden mobile-pip-hide">
      <GameSwitcher games={games} selectedGameId={game.id} />
    </div>
    <motion.section
      className="activity-compact:gap-2 mobile-pip-hide grid grid-cols-2 gap-3"
      aria-label="Archived game totals"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <ArchiveTotal
        icon={<Skull aria-hidden="true" />}
        value={game.deaths}
        label="Total deaths"
      />
      <ArchiveTotal
        icon={<Trophy aria-hidden="true" />}
        value={game.killedBossCount}
        label="Bosses killed"
      />
    </motion.section>
    <div className="activity-compact:hidden mobile-pip-hide">
      <BossHistory bosses={game.killedBosses} />
    </div>
    <footer className="activity-compact:hidden mobile-pip-hide py-2 text-center text-[0.65rem] text-muted-foreground sm:py-3 sm:text-xs">
      Archived game stats · Anonymous view
    </footer>
  </motion.main>
);
