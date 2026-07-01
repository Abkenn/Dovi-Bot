import { prisma } from '../../lib/prisma';
import type {
  AdvanceReactionEchoCounterInput,
  ReactionEchoCounterRow,
} from './reaction-echo.types';

export const advanceReactionEchoCounter = async ({
  ruleId,
  every,
  incrementBy,
}: AdvanceReactionEchoCounterInput) => {
  const rows = await prisma.$queryRaw<ReactionEchoCounterRow[]>`
    INSERT INTO "ReactionEchoCounter" ("ruleId", "count", "updatedAt")
    VALUES (
      ${ruleId},
      CAST(${incrementBy} AS INTEGER) % CAST(${every} AS INTEGER),
      NOW()
    )
    ON CONFLICT ("ruleId") DO UPDATE
    SET
      "count" = (
        "ReactionEchoCounter"."count" + CAST(${incrementBy} AS INTEGER)
      ) % CAST(${every} AS INTEGER),
      "updatedAt" = NOW()
    RETURNING "count"
  `;
  const count = rows[0]?.count;

  return count !== undefined && (incrementBy >= every || count < incrementBy);
};
