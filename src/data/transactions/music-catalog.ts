import { prisma } from '../../lib/prisma';
import type { ReplaceMusicCatalogInput } from './music-catalog.types';

export const replaceMusicCatalog = async (input: ReplaceMusicCatalogInput) =>
  prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(726489103)`;
      const current = await transaction.musicCatalog.findUnique({
        where: { id: 'primary' },
      });
      if (current && input.allowCurrentSource) {
        if (
          current.messageId !== input.messageId ||
          current.attachmentId !== input.attachmentId
        )
          return false;
      } else if (current) {
        if (current.messageId > input.messageId) return false;
        if (
          current.messageId === input.messageId &&
          current.attachmentId >= input.attachmentId
        )
          return false;
      }
      const { plays, allowCurrentSource: _allowCurrentSource, ...data } = input;
      await transaction.musicCatalog.upsert({
        where: { id: 'primary' },
        create: { id: 'primary', ...data },
        update: data,
      });
      await transaction.musicPlay.deleteMany({
        where: { catalogId: 'primary' },
      });
      await transaction.musicPlay.createMany({
        data: plays.map((play) => ({ ...play, catalogId: 'primary' })),
      });
      return true;
    },
    { timeout: 15_000 },
  );
