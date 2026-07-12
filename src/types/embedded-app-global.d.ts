import type { EmbeddedAppStats } from '../modules/embedded-app/embedded-app-stats.types';

declare global {
  var __doviEmbeddedAppStatsLoader:
    | (() => Promise<EmbeddedAppStats>)
    | undefined;
}
