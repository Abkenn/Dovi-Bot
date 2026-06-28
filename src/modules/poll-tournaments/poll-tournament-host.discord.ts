import type { MessageEditOptions } from 'discord.js';
import { POLL_TOURNAMENT_CONFIG } from './poll-tournament.config';

export const buildStartedPollTournamentHostMessage = ({
  title,
  uniqueCount,
  nominatorCount,
  maxNominationsPerUser,
}: {
  title: string;
  uniqueCount: number;
  nominatorCount: number;
  maxNominationsPerUser: number;
}): MessageEditOptions => ({
  content: [
    `**${title}**`,
    `Nominations are closed. The tournament is running in <#${POLL_TOURNAMENT_CONFIG.channelId}>.`,
    `Unique nominations: **${uniqueCount}**`,
    `Nominators: **${nominatorCount}**`,
    `Limit per person: **${maxNominationsPerUser}**`,
  ].join('\n'),
  allowedMentions: { parse: [] },
});
