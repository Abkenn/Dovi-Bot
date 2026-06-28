import { describe, expect, it } from 'vitest';
import {
  buildPollTournamentPlan,
  cleanPollText,
  normalizePollOption,
  rankFinalists,
} from '../../src/modules/poll-tournaments/poll-tournament.utils';

describe('normalizePollOption', () => {
  it('normalizes compatibility characters, case, and repeated whitespace', () => {
    expect(normalizePollOption('  ＤＡＲＫ\tSouls  III  ')).toBe(
      'dark souls iii',
    );
  });

  it('cleans display text without lowercasing it', () => {
    expect(cleanPollText('  Dark\n  Souls  ')).toBe('Dark Souls');
  });
});

describe('buildPollTournamentPlan', () => {
  it('builds the requested 28-option tournament shape', () => {
    expect(buildPollTournamentPlan(28)).toEqual({
      durationDays: 17,
      rounds: [
        { kind: 'QUALIFICATION', bracketSizes: [4, 4, 4, 4, 4, 4, 4] },
        { kind: 'ELIMINATION', bracketSizes: [2, 2, 3] },
        { kind: 'FINAL', bracketSizes: [3] },
      ],
    });
  });

  it('keeps qualification brackets balanced for a prime option count', () => {
    expect(buildPollTournamentPlan(17).rounds[0]).toEqual({
      kind: 'QUALIFICATION',
      bracketSizes: [4, 4, 4, 5],
    });
  });

  it('uses a direct final only below four options', () => {
    expect(buildPollTournamentPlan(3)).toEqual({
      durationDays: 3,
      rounds: [{ kind: 'FINAL', bracketSizes: [3] }],
    });
  });

  it('gives four and five options two qualifiers before the final', () => {
    expect(buildPollTournamentPlan(4).rounds).toEqual([
      { kind: 'QUALIFICATION', bracketSizes: [2, 2] },
      { kind: 'FINAL', bracketSizes: [2] },
    ]);
    expect(buildPollTournamentPlan(5).rounds).toEqual([
      { kind: 'QUALIFICATION', bracketSizes: [2, 3] },
      { kind: 'FINAL', bracketSizes: [2] },
    ]);
  });

  it('gives six options two semifinals and a two-option final', () => {
    expect(buildPollTournamentPlan(6).rounds).toEqual([
      { kind: 'QUALIFICATION', bracketSizes: [3, 3] },
      { kind: 'FINAL', bracketSizes: [2] },
    ]);
  });

  it('gives nine options three semifinals and a three-option final', () => {
    expect(buildPollTournamentPlan(9).rounds).toEqual([
      { kind: 'QUALIFICATION', bracketSizes: [3, 3, 3] },
      { kind: 'FINAL', bracketSizes: [3] },
    ]);
  });

  it('gives ten options three balanced qualifiers and three finalists', () => {
    expect(buildPollTournamentPlan(10).rounds).toEqual([
      { kind: 'QUALIFICATION', bracketSizes: [3, 3, 4] },
      { kind: 'FINAL', bracketSizes: [3] },
    ]);
  });

  it('builds the preferred 44-option shape', () => {
    expect(buildPollTournamentPlan(44).rounds).toEqual([
      {
        kind: 'QUALIFICATION',
        bracketSizes: Array.from({ length: 11 }, () => 4),
      },
      { kind: 'ELIMINATION', bracketSizes: [3, 4, 4] },
      { kind: 'FINAL', bracketSizes: [3] },
    ]);
  });

  it('allows five-option qualifiers when a large field exceeds the guide', () => {
    const plan = buildPollTournamentPlan(90);

    expect(plan.durationDays).toBe(35);
    expect(plan.rounds[0]).toEqual({
      kind: 'QUALIFICATION',
      bracketSizes: Array.from({ length: 18 }, () => 5),
    });
  });

  it('uses three-option elimination layers when the field supports them', () => {
    const plan = buildPollTournamentPlan(60);

    expect(plan).toEqual({
      durationDays: 27,
      rounds: [
        {
          kind: 'QUALIFICATION',
          bracketSizes: Array.from({ length: 15 }, () => 4),
        },
        { kind: 'ELIMINATION', bracketSizes: [3, 3, 3, 3, 3] },
        { kind: 'FINAL', bracketSizes: [5] },
      ],
    });
  });

  it('reduces six winners through two semifinals before a two-option final', () => {
    const plan = buildPollTournamentPlan(24);

    expect(plan.rounds).toEqual([
      {
        kind: 'QUALIFICATION',
        bracketSizes: [4, 4, 4, 4, 4, 4],
      },
      { kind: 'ELIMINATION', bracketSizes: [3, 3] },
      { kind: 'FINAL', bracketSizes: [2] },
    ]);
  });
  it('allows up to three months for tournaments with hundreds of options', () => {
    expect(buildPollTournamentPlan(500).durationDays).toBeLessThanOrEqual(90);
  });

  it('rejects counts that cannot finish within the applicable hard limit', () => {
    expect(() => buildPollTournamentPlan(1_000)).toThrow(
      'cannot finish within 90 days',
    );
  });
});

describe('rankFinalists', () => {
  it('ranks by final votes and uses the persisted draw only for ties', () => {
    expect(
      rankFinalists([
        { optionId: 'a', finalVotes: 8, totalVotes: 20, tieBreakOrder: 2 },
        { optionId: 'b', finalVotes: 10, totalVotes: 10, tieBreakOrder: 3 },
        { optionId: 'c', finalVotes: 8, totalVotes: 100, tieBreakOrder: 1 },
      ]),
    ).toEqual([
      { optionId: 'b', finalVotes: 10, totalVotes: 10, tieBreakOrder: 3 },
      { optionId: 'c', finalVotes: 8, totalVotes: 100, tieBreakOrder: 1 },
      { optionId: 'a', finalVotes: 8, totalVotes: 20, tieBreakOrder: 2 },
    ]);
  });
});
