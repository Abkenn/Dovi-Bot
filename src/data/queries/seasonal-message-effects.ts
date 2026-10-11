import { prisma } from '../../lib/prisma';
import type { SaveSeasonalMessageEffectInput } from './seasonal-message-effects.types';

export const saveSeasonalMessageEffect = (
  input: SaveSeasonalMessageEffectInput,
) =>
  prisma.seasonalMessageEffect.upsert({
    where: { messageId: input.messageId },
    update: {},
    create: {
      ...input,
      originalButtons: input.originalButtons.map((button) => ({
        ...button,
        emoji: button.emoji ? { ...button.emoji } : null,
      })),
    },
  });

export const findSeasonalMessageEffects = () =>
  prisma.seasonalMessageEffect.findMany({
    orderBy: { eyeExpiresAt: 'asc' },
  });

export const deleteSeasonalMessageEffect = (messageId: string) =>
  prisma.seasonalMessageEffect.deleteMany({ where: { messageId } });
