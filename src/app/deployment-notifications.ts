import type { SapphireClient } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';
import type {
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageResult,
  RESTPostAPICurrentUserCreateDMChannelJSONBody,
} from 'discord.js';
import { z } from 'zod';
import { discordApi, githubApi } from '../lib/api';

const githubDeploymentsSchema = z.array(
  z.object({ sha: z.string().optional() }),
);
const githubCompareSchema = z.object({
  commits: z
    .array(
      z.object({
        commit: z.object({ message: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});
const discordDmChannelSchema = z.object({ id: z.string().optional() });

const DISCORD_MESSAGE_LIMIT = 2000;

let hasSentDeploymentFailed = false;
let commitTitlesPromise: Promise<string[]> | null = null;

const getGitHubHeaders = () => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'dovi-bot-deployment-notifier',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (env.DEPLOYMENT_CHANGELOG_GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.DEPLOYMENT_CHANGELOG_GITHUB_TOKEN}`;
  }

  return headers;
};

const parseGitHubRepository = (repository: string) => {
  const normalizedRepository = repository
    .replace(/^https?:\/\//, '')
    .replace(/^git@github\.com:/, 'github.com/')
    .replace(/\.git$/, '');
  const [host, owner, repo] = normalizedRepository.split('/');

  if (host !== 'github.com' || !owner || !repo) {
    return null;
  }

  return { owner, repo };
};

const fetchGitHubJson = async <T>(
  url: string,
  schema: z.ZodType<T>,
): Promise<T | null> => {
  const response = await githubApi.get<T>(url, { headers: getGitHubHeaders() });

  if (!response.ok) {
    console.warn(
      `Deployment changelog GitHub request failed: ${response.status} ${response.statusText}`,
    );
    return null;
  }

  return schema.parse(await response.json());
};

const getCommitTitle = (message: string) =>
  message.split(/\r?\n/, 1)[0]?.trim() || '(empty commit message)';

const getFallbackCommitTitles = () => {
  if (!env.KOYEB_GIT_COMMIT_MESSAGE) {
    return [];
  }

  return [getCommitTitle(env.KOYEB_GIT_COMMIT_MESSAGE)];
};

const fetchDeploymentCommitTitles = async () => {
  if (!env.KOYEB_GIT_REPOSITORY || !env.KOYEB_GIT_SHA) {
    return getFallbackCommitTitles();
  }

  const repository = parseGitHubRepository(env.KOYEB_GIT_REPOSITORY);

  if (!repository) {
    return getFallbackCommitTitles();
  }

  const repoUrl = `repos/${repository.owner}/${repository.repo}`;
  const deployments = await fetchGitHubJson(
    `${repoUrl}/deployments?per_page=20`,
    githubDeploymentsSchema,
  );

  const previousDeployment = deployments?.find(
    (deployment) => deployment.sha && deployment.sha !== env.KOYEB_GIT_SHA,
  );

  if (!previousDeployment?.sha) {
    return getFallbackCommitTitles();
  }

  const compare = await fetchGitHubJson(
    `${repoUrl}/compare/${previousDeployment.sha}...${env.KOYEB_GIT_SHA}`,
    githubCompareSchema,
  );
  const titles = compare?.commits
    ?.map((commit) => commit.commit?.message)
    .filter((message): message is string => Boolean(message))
    .map(getCommitTitle);

  return titles?.length ? titles : getFallbackCommitTitles();
};

const getDeploymentCommitTitles = () => {
  commitTitlesPromise ??= fetchDeploymentCommitTitles();

  return commitTitlesPromise;
};

const buildChangelogText = (commitTitles: string[]) => {
  if (!commitTitles.length) {
    return 'Changelog: No commit message available.';
  }

  if (commitTitles.length === 1) {
    return `Changelog: ${commitTitles[0]}`;
  }

  return ['Changelog:', ...commitTitles.map((title) => `- ${title}`)].join(
    '\n',
  );
};

const trimMessageToDiscordLimit = (message: string) => {
  if (message.length <= DISCORD_MESSAGE_LIMIT) {
    return message;
  }

  const prefix = message.slice(0, DISCORD_MESSAGE_LIMIT - 32).trimEnd();

  return `${prefix}\n- Changelog truncated.`;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const buildDeploymentFinishedMessage = (commitTitles: string[]) => {
  const lines = [
    '---',
    '**Dovi Bot deployment finished**',
    'Status: successful',
    buildChangelogText(commitTitles),
  ];

  return trimMessageToDiscordLimit(lines.join('\n'));
};

const buildDeploymentFailedMessage = ({
  commitTitles,
  error,
}: {
  commitTitles: string[];
  error: unknown;
}) => {
  const lines = [
    '---',
    '**Dovi Bot deployment failed**',
    'Status: unsuccessful',
    `- Error: ${getErrorMessage(error)}`,
    buildChangelogText(commitTitles),
  ];

  return trimMessageToDiscordLimit(lines.join('\n'));
};

const sendDeploymentDmWithToken = async (content: string) => {
  if (!env.DEPLOYMENT_NOTIFY_USER_ID) {
    return;
  }

  const channelBody: RESTPostAPICurrentUserCreateDMChannelJSONBody = {
    recipient_id: env.DEPLOYMENT_NOTIFY_USER_ID,
  };
  const channelResponse = await discordApi.post<
    z.infer<typeof discordDmChannelSchema>
  >('users/@me/channels', {
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    json: channelBody,
  });

  if (!channelResponse.ok) {
    throw new Error(
      `Failed to open deployment DM channel: ${channelResponse.status} ${channelResponse.statusText}`,
    );
  }

  const channel = discordDmChannelSchema.parse(await channelResponse.json());

  if (!channel.id) {
    throw new Error('Discord did not return a deployment DM channel id.');
  }

  const messageBody: RESTPostAPIChannelMessageJSONBody = { content };
  const messageResponse =
    await discordApi.post<RESTPostAPIChannelMessageResult>(
      `channels/${channel.id}/messages`,
      {
        headers: {
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        json: messageBody,
      },
    );

  if (!messageResponse.ok) {
    throw new Error(
      `Failed to send deployment DM: ${messageResponse.status} ${messageResponse.statusText}`,
    );
  }
};

export const notifyDeploymentFailed = async (error: unknown) => {
  if (!env.DEPLOYMENT_NOTIFY_USER_ID || hasSentDeploymentFailed) {
    return;
  }

  hasSentDeploymentFailed = true;
  const commitTitles = await getDeploymentCommitTitles();

  await sendDeploymentDmWithToken(
    buildDeploymentFailedMessage({ commitTitles, error }),
  );
};

export const notifyDeploymentReady = async (client: SapphireClient) => {
  if (!env.DEPLOYMENT_NOTIFY_USER_ID) {
    return;
  }

  const commitTitles = await getDeploymentCommitTitles();
  const user = await client.users.fetch(env.DEPLOYMENT_NOTIFY_USER_ID);

  await user.send(buildDeploymentFinishedMessage(commitTitles));
};
