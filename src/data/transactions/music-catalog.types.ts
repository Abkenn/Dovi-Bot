export type ReplaceMusicCatalogInput = {
  messageId: bigint;
  attachmentId: bigint;
  uploaderId: string;
  filename: string;
  rawText: string;
  allowCurrentSource?: boolean;
  plays: {
    streamLabel: string;
    streamDate: string;
    offsetSeconds: number;
    title: string;
    originalTitle: string;
    game: string | null;
    musicMode:
      | 'DEMOCRACY'
      | 'CAPITALISM'
      | 'PATREON_CAPITALISM'
      | 'DICTATORSHIP'
      | 'UNKNOWN';
  }[];
};
