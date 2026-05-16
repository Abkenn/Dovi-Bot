import type {
  Client,
  MessageCreateOptions,
  TextBasedChannel,
} from 'discord.js';
import {
  buildBossTrialEmbed,
  buildBossTrialFinalResultsEmbed,
  buildBossTrialVoteButtons,
} from './boss-trial.discord';
import {
  type BossTrialView,
  getPendingBossTrialLifecycleEvents,
  isBossTrialStorageReady,
  markBossTrialFinalResultsPosted,
  markBossTrialLiveResultsPublished,
  shouldPostBossTrialFinalResults,
  shouldPublishBossTrialLiveResults,
} from './boss-trial.service';

const getTrialChannel = async (client: Client, channelId: string) => {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased()) {
    return null;
  }

  return channel;
};

const sendChannelMessage = (
  channel: TextBasedChannel,
  options: MessageCreateOptions,
) => {
  if (!('send' in channel)) {
    throw new Error('Boss trial channel does not support sending messages.');
  }

  return channel.send(options);
};

export const refreshBossTrialMessage = async (
  client: Client,
  trial: BossTrialView,
) => {
  if (!trial.messageId) {
    return;
  }

  const channel = await getTrialChannel(client, trial.channelId);

  if (!channel || !('messages' in channel)) {
    return;
  }

  const message = await channel.messages
    .fetch(trial.messageId)
    .catch(() => null);

  if (!message) {
    return;
  }

  await message.edit({
    embeds: [buildBossTrialEmbed(trial)],
    components: [buildBossTrialVoteButtons(trial.id)],
  });
};

export const postBossTrialResultsMessage = async ({
  client,
  trial,
}: {
  client: Client;
  trial: BossTrialView;
}) => {
  const channel = await getTrialChannel(client, trial.channelId);

  if (!channel) {
    throw new Error('Boss trial channel could not be found.');
  }

  return sendChannelMessage(channel, {
    embeds: [buildBossTrialFinalResultsEmbed(trial)],
  });
};

export const runBossTrialLifecycleTick = async (client: Client) => {
  if (!(await isBossTrialStorageReady())) {
    console.info('Boss trial lifecycle skipped: tables are missing.');
    return;
  }

  const trials = await getPendingBossTrialLifecycleEvents();

  for (const trial of trials) {
    try {
      let currentTrial = trial;

      if (shouldPublishBossTrialLiveResults(currentTrial)) {
        await refreshBossTrialMessage(client, currentTrial);
        currentTrial = await markBossTrialLiveResultsPublished(currentTrial.id);
      }

      if (shouldPostBossTrialFinalResults(currentTrial)) {
        await postBossTrialResultsMessage({ client, trial: currentTrial });
        currentTrial = await markBossTrialFinalResultsPosted(currentTrial.id);
        await refreshBossTrialMessage(client, currentTrial);
      }
    } catch (error) {
      console.error(`Boss trial lifecycle failed for ${trial.id}`, error);
    }
  }
};
