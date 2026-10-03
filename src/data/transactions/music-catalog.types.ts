export type ReplaceMusicCatalogInput = {
  messageId: bigint;
  attachmentId: bigint;
  uploaderId: string;
  filename: string;
  rawText: string;
  plays: {
    streamLabel: string;
    streamDate: string;
    offsetSeconds: number;
    title: string;
    originalTitle: string;
    musicMode:
      | 'DEMOCRACY'
      | 'CAPITALISM'
      | 'PATREON_CAPITALISM'
      | 'DICTATORSHIP'
      | 'UNKNOWN';
  }[];
};
