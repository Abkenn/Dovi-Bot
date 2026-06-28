import { describe, expect, it } from 'vitest';
import type { PollTournamentView } from '../../src/data/queries/poll-tournament';
import {
  buildPollTournamentAnnouncementMessages,
  buildPollTournamentBracketMessage,
  buildPollTournamentFinalResultsMessage,
  buildPollTournamentHostMessage,
} from '../../src/modules/poll-tournaments/poll-tournament.discord';
import { buildExtendedPollTournamentResultsMessage } from '../../src/modules/poll-tournaments/poll-tournament-results.discord';
import { buildPollTournamentStatusPages } from '../../src/modules/poll-tournaments/poll-tournament-status.discord';

const date = new Date('2026-06-28T12:00:00.000Z');

const createOption = (index: number) => ({
  id: `option-${index}`,
  tournamentId: 'tournament',
  text: `Option ${index}`,
  normalizedText: `option ${index}`,
  seedOrder: index,
  tieBreakOrder: index,
  totalVotes: index + 10,
  createdAt: date,
  updatedAt: date,
});

const createTournament = ({
  status = 'NOMINATING',
  optionCount = 3,
}: {
  status?: PollTournamentView['status'];
  optionCount?: number;
} = {}): PollTournamentView => {
  const options = Array.from({ length: optionCount }, (_, index) =>
    createOption(index),
  );
  const bracket = {
    id: 'bracket',
    roundId: 'round',
    bracketNumber: 1,
    optionCount,
    status: 'ACTIVE' as const,
    messageId: 'poll-message',
    startsAt: date,
    endsAt: new Date(date.getTime() + 259_200_000),
    createdAt: date,
    updatedAt: date,
    entries: options.map((option, index) => ({
      id: `entry-${index}`,
      bracketId: 'bracket',
      optionId: option.id,
      position: index,
      voteCount: index + 1,
      createdAt: date,
      updatedAt: date,
      option,
    })),
  };

  return {
    id: 'tournament',
    guildId: 'guild',
    hostUserId: 'host',
    title: 'Best Thing',
    maxNominationsPerUser: 3,
    status,
    hostChannelId: 'host-channel',
    hostMessageId: 'host-message',
    announcementMessageId: null,
    plannedDurationDays: null,
    startedAt: null,
    completedAt: null,
    createdAt: date,
    updatedAt: date,
    nominations: options.map((option, index) => ({
      id: `nomination-${index}`,
      tournamentId: 'tournament',
      nominatorUserId: `user-${index}`,
      text: option.text,
      normalizedText: option.normalizedText,
      removedAt: null,
      removedByUserId: null,
      createdAt: date,
      updatedAt: date,
    })),
    options,
    rounds: [
      {
        id: 'round',
        tournamentId: 'tournament',
        roundNumber: 1,
        kind: 'FINAL',
        status: 'ACTIVE',
        createdAt: date,
        updatedAt: date,
        brackets: [bracket],
      },
    ],
  };
};

describe('poll tournament Discord output', () => {
  it('shows only aggregate nomination counts in the public host message', () => {
    const message = buildPollTournamentHostMessage({
      title: 'Best Game',
      uniqueCount: 12,
      nominatorCount: 7,
      maxNominationsPerUser: 5,
    });

    expect(message.content).toContain('Unique nominations: **12**');
    expect(message.content).toContain('Nominators: **7**');
    expect(message.content).toContain('up to 5 options');
    expect(message.content).not.toContain('user-');
  });

  it('builds a single-choice three-day native Discord poll', () => {
    const tournament = createTournament({ status: 'RUNNING' });
    const round = tournament.rounds[0];
    const bracket = round?.brackets[0];

    if (!round || !bracket) {
      throw new Error('Expected a final-round bracket.');
    }

    const message = buildPollTournamentBracketMessage({
      tournament,
      round,
      bracket,
    });

    expect(message.poll).toMatchObject({
      duration: 72,
      allowMultiselect: false,
      answers: [
        { text: 'Option 0' },
        { text: 'Option 1' },
        { text: 'Option 2' },
      ],
    });
  });

  it('builds chunked announcements for every tournament layer', () => {
    const tournament = createTournament({
      status: 'RUNNING',
      optionCount: 200,
    });
    const templateRound = tournament.rounds[0];

    if (!templateRound) {
      throw new Error('Expected a template round.');
    }

    tournament.rounds = [
      { ...templateRound, id: 'qualification', kind: 'QUALIFICATION' },
      {
        ...templateRound,
        id: 'elimination',
        roundNumber: 2,
        kind: 'ELIMINATION',
      },
      { ...templateRound, id: 'final', roundNumber: 3, kind: 'FINAL' },
    ];
    const messages = buildPollTournamentAnnouncementMessages(tournament);

    expect(messages.length).toBeGreaterThan(1);
    expect(messages[0]?.content).toContain('qualification brackets');
    expect(messages[0]?.content).toContain('elimination brackets');
    expect(messages[0]?.content).toContain('1 final');
    expect(messages[0]?.allowedMentions).toEqual({
      parse: [],
      roles: ['1520860726648897536'],
    });
    expect(messages[1]?.allowedMentions).toEqual({ parse: [] });
  });

  it('labels qualification and later elimination poll layers', () => {
    const tournament = createTournament({ status: 'RUNNING' });
    const round = tournament.rounds[0];
    const bracket = round?.brackets[0];

    if (!round || !bracket) {
      throw new Error('Expected a poll bracket.');
    }

    round.kind = 'QUALIFICATION';
    expect(
      buildPollTournamentBracketMessage({ tournament, round, bracket }).poll
        ?.question.text,
    ).toContain('Qualification');

    round.kind = 'ELIMINATION';
    round.roundNumber = 2;
    expect(
      buildPollTournamentBracketMessage({ tournament, round, bracket }).poll
        ?.question.text,
    ).toContain('Round 2');
  });

  it('paginates large private nomination lists without dropping options', () => {
    const tournament = createTournament({ optionCount: 200 });
    const duplicateNomination = tournament.nominations[0];

    if (duplicateNomination) {
      tournament.nominations.push({
        ...duplicateNomination,
        id: 'duplicate-nomination',
        nominatorUserId: 'duplicate-user',
      });
    }

    const pages = buildPollTournamentStatusPages([tournament]);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => page.length <= 1_900)).toBe(true);
    expect(pages.join('\n')).toContain('200. Option 199');
  });

  it('shows empty, starting, running, and finalizing private statuses', () => {
    expect(buildPollTournamentStatusPages([])).toEqual([
      'You have no active hosted polls.',
    ]);

    const empty = createTournament();
    empty.nominations = [];
    const starting = createTournament({ status: 'STARTING' });
    const running = createTournament({ status: 'RUNNING' });
    const runningBracket = running.rounds[0]?.brackets[0];

    if (runningBracket) {
      runningBracket.status = 'COMPLETE';
    }

    const finalizing = createTournament({ status: 'FINALIZING' });
    const finalizingRound = finalizing.rounds[0];

    if (finalizingRound) {
      finalizingRound.status = 'COMPLETE';
    }

    const output = buildPollTournamentStatusPages([
      empty,
      starting,
      running,
      finalizing,
    ]).join('\n');

    expect(output).toContain('No nominations yet.');
    expect(output).toContain('Status: Starting now.');
    expect(output).toContain('1/1 brackets complete.');
    expect(output).toContain('Status: Finalizing results');
    expect(output).toContain('Finishing the tournament now.');
  });

  it('ranks finalists by final votes and reports total tournament votes', () => {
    const tournament = createTournament({ status: 'RUNNING' });
    const message = buildPollTournamentFinalResultsMessage({
      tournament,
      finalists: [
        {
          optionId: 'option-0',
          finalVotes: 5,
          totalVotes: 15,
          tieBreakOrder: 0,
        },
        {
          optionId: 'option-1',
          finalVotes: 8,
          totalVotes: 18,
          tieBreakOrder: 1,
        },
        {
          optionId: 'option-2',
          finalVotes: 3,
          totalVotes: 13,
          tieBreakOrder: 2,
        },
      ],
    });

    expect(message.content).toContain('**1.** Option 1: **8** final votes');
    expect(message.content).toContain('(**18** total)');
  });

  it('includes unranked semifinalists when a rare final has two options', () => {
    const tournament = createTournament({ status: 'RUNNING', optionCount: 6 });
    const message = buildExtendedPollTournamentResultsMessage({
      tournament,
      finalists: [
        {
          optionId: 'option-0',
          finalVotes: 8,
          totalVotes: 20,
          tieBreakOrder: 0,
        },
        {
          optionId: 'option-1',
          finalVotes: 6,
          totalVotes: 18,
          tieBreakOrder: 1,
        },
      ],
      semifinalists: [
        { optionId: 'missing-semifinalist', semifinalVotes: 2, totalVotes: 12 },
        ...[3, 4, 5].map((index) => ({
          optionId: `option-${index}`,
          semifinalVotes: index,
          totalVotes: index + 10,
        })),
      ],
    });

    expect(message.content).toContain(
      'Other semifinalists (unranked across separate polls)',
    );
    expect(message.content).toContain('Option 5');
    expect(message.content).toContain('Unknown option');
  });

  it('returns ordinary results when there are no extra semifinalists', () => {
    const tournament = createTournament({ status: 'RUNNING' });
    const message = buildExtendedPollTournamentResultsMessage({
      tournament,
      finalists: [
        {
          optionId: 'missing-option',
          finalVotes: 1,
          totalVotes: 1,
          tieBreakOrder: 1,
        },
      ],
      semifinalists: [],
    });

    expect(message.content).toContain('Unknown option');
    expect(message.content).not.toContain('Other semifinalists');
  });
});
