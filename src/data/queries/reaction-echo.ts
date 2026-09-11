import { prisma } from '../../lib/prisma';
import type {
  AdvanceReactionEchoCounterInput,
  ReactionEchoCounterRow,
} from './reaction-echo.types';

export const advanceReactionEchoCounter = async ({
  ruleId,
  every,
  incrementBy,
  authorId,
}: AdvanceReactionEchoCounterInput) => {
  const rows = await prisma.$queryRaw<ReactionEchoCounterRow[]>`
    INSERT INTO "ReactionEchoCounter" (
      "ruleId",
      "count",
      "lastEchoAuthorId",
      "lastAdvanceTriggered",
      "updatedAt"
    )
    VALUES (
      ${ruleId},
      CAST(${incrementBy} AS INTEGER) % CAST(${every} AS INTEGER),
      CASE
        WHEN CAST(${incrementBy} AS INTEGER) >= CAST(${every} AS INTEGER)
          THEN ${authorId}
        ELSE NULL
      END,
      CAST(${incrementBy} AS INTEGER) >= CAST(${every} AS INTEGER),
      NOW()
    )
    ON CONFLICT ("ruleId") DO UPDATE
    SET
      "count" = CASE
        WHEN
          "ReactionEchoCounter"."count" + CAST(${incrementBy} AS INTEGER) >= CAST(${every} AS INTEGER)
          AND "ReactionEchoCounter"."lastEchoAuthorId" IS DISTINCT FROM ${authorId}
          THEN (
            "ReactionEchoCounter"."count" + CAST(${incrementBy} AS INTEGER)
          ) % CAST(${every} AS INTEGER)
        WHEN "ReactionEchoCounter"."count" + CAST(${incrementBy} AS INTEGER) >= CAST(${every} AS INTEGER)
          THEN CAST(${every} AS INTEGER)
        ELSE "ReactionEchoCounter"."count" + CAST(${incrementBy} AS INTEGER)
      END,
      "lastEchoAuthorId" = CASE
        WHEN
          "ReactionEchoCounter"."count" + CAST(${incrementBy} AS INTEGER) >= CAST(${every} AS INTEGER)
          AND "ReactionEchoCounter"."lastEchoAuthorId" IS DISTINCT FROM ${authorId}
          THEN ${authorId}
        ELSE "ReactionEchoCounter"."lastEchoAuthorId"
      END,
      "lastAdvanceTriggered" = (
        "ReactionEchoCounter"."count" + CAST(${incrementBy} AS INTEGER) >= CAST(${every} AS INTEGER)
        AND "ReactionEchoCounter"."lastEchoAuthorId" IS DISTINCT FROM ${authorId}
      ),
      "updatedAt" = NOW()
    RETURNING "lastAdvanceTriggered"
  `;

  return rows[0]?.lastAdvanceTriggered ?? false;
};
