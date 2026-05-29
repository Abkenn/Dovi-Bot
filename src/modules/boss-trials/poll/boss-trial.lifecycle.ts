import type {
  Client,
  MessageCreateOptions,
  TextBasedChannel,
} from 'discord.js';
import {
  buildBossTrialBumpMessage,
  buildBossTrialFinalResultsMessage,
  buildBossTrialPollMessage,
  buildBossTrialVotesVisibleMessage,
} from './boss-trial.discord';
import {
  attachBossTrialBumpMessage,
  type BossTrialView,
  claimBossTrialAutomaticBump,
  claimBossTrialFinalResults,
  claimBossTrialLiveResults,
  getBossTrialView,
  getPendingBossTrialLifecycleEvents,
  isBossTrialStorageReady,
  shouldPostBossTrialAutomaticBump,
  shouldPostBossTrialFinalResults,
  shouldPostBossTrialVotesVisibleBump,
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

const getBossTrialReplyOptions = (trial: BossTrialView) =>
  trial.messageId
    ? ({
        reply: {
          messageReference: trial.messageId,
          failIfNotExists: false,
        },
      } satisfies MessageCreateOptions)
    : {};

export const refreshBossTrialMessage = async (
  client: Client,
  trial: BossTrialView,
) => {
  const messageIds = [
    trial.messageId,
    ...trial.bumpMessages.map((message) => message.messageId),
  ].filter((messageId) => messageId !== null);

  if (messageIds.length === 0) {
    return;
  }

  const channel = await getTrialChannel(client, trial.channelId);

  if (!channel || !('messages' in channel)) {
    return;
  }

  await Promise.all(
    messageIds.map(async (messageId) => {
      const message = await channel.messages.fetch(messageId).catch(() => null);

      if (!message) {
        return;
      }

      await message.edit(buildBossTrialPollMessage(trial));
    }),
  );
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
    ...getBossTrialReplyOptions(trial),
    ...buildBossTrialFinalResultsMessage(trial),
  });
};

export const postBossTrialBumpMessage = async ({
  client,
  trial,
  isAutomatic,
}: {
  client: Client;
  trial: BossTrialView;
  isAutomatic: boolean;
}) => {
  const channel = await getTrialChannel(client, trial.channelId);

  if (!channel) {
    throw new Error('Boss trial channel could not be found.');
  }

  const message = await sendChannelMessage(channel, {
    ...getBossTrialReplyOptions(trial),
    ...buildBossTrialBumpMessage({ trial, isAutomatic }),
  });

  await attachBossTrialBumpMessage({
    trialId: trial.id,
    messageId: message.id,
  });

  return message;
};

export const postBossTrialVotesVisibleMessage = async ({
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

  const message = await sendChannelMessage(channel, {
    ...getBossTrialReplyOptions(trial),
    ...buildBossTrialVotesVisibleMessage(trial),
  });

  await attachBossTrialBumpMessage({
    trialId: trial.id,
    messageId: message.id,
  });

  return message;
};

export const runBossTrialLifecycleTick = async (client: Client) => {
  if (!(await isBossTrialStorageReady())) {
    console.info('Boss trial lifecycle skipped: schema is not ready.');
    return;
  }

  const trials = await getPendingBossTrialLifecycleEvents();

  for (const trial of trials) {
    try {
      let currentTrial = trial;

      if (shouldPostBossTrialAutomaticBump(currentTrial)) {
        const claimedTrial = await claimBossTrialAutomaticBump(currentTrial.id);
        currentTrial =
          claimedTrial ?? (await getBossTrialView(currentTrial.id));

        if (claimedTrial) {
          await postBossTrialBumpMessage({
            client,
            trial: currentTrial,
            isAutomatic: true,
          });
        }
      }

      if (shouldPublishBossTrialLiveResults(currentTrial)) {
        const claimedTrial = await claimBossTrialLiveResults(currentTrial.id);
        currentTrial =
          claimedTrial ?? (await getBossTrialView(currentTrial.id));

        if (claimedTrial) {
          await refreshBossTrialMessage(client, currentTrial);
          if (shouldPostBossTrialVotesVisibleBump(currentTrial)) {
            await postBossTrialVotesVisibleMessage({
              client,
              trial: currentTrial,
            });
          }
        }
      }

      if (shouldPostBossTrialFinalResults(currentTrial)) {
        const claimedTrial = await claimBossTrialFinalResults(currentTrial.id);
        currentTrial =
          claimedTrial ?? (await getBossTrialView(currentTrial.id));

        if (claimedTrial) {
          await postBossTrialResultsMessage({ client, trial: currentTrial });
          await refreshBossTrialMessage(client, currentTrial);
        }
      }
    } catch (error) {
      console.error(`Boss trial lifecycle failed for ${trial.id}`, error);
    }
  }
};
