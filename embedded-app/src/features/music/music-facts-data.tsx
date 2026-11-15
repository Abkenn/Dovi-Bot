import { musicFactsOptions, musicQueries } from './music.queries';
import { MusicContent } from './music-content';
import { MusicPipSummary } from './music-pip-summary';

type MusicFactsDataProps = { compact: boolean };

export const MusicFactsData = ({ compact }: MusicFactsDataProps) => {
  const { data: facts } = musicQueries.useFactsSuspenseQuery(musicFactsOptions);
  const data = { kind: 'facts' as const, facts };
  return compact ? (
    <MusicPipSummary data={data} />
  ) : (
    <MusicContent data={data} game={false} />
  );
};
