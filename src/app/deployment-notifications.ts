import type { SapphireClient } from '@sapphire/framework';
import { env } from '@zod-schemas/env.zod';

type GitHubDeployment = {
  sha?: string;
};

type GitHubCommit = {
  commit?: {
    message?: string;
  };
};

type GitHubCompareResponse = {
  commits?: GitHubCommit[];
};

const DISCORD_MESSAGE_LIMIT = 2000;
const CHANGELOG_HEADER = 'Changelog:';

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

const fetchGitHubJson = async <T>(url: string): Promise<T | null> => {
  const response = await fetch(url, { headers: getGitHubHeaders() });

  if (!response.ok) {
    console.warn(
      `Deployment changelog GitHub request failed: ${response.status} ${response.statusText}`,
    );
    return null;
  }

  return (await response.json()) as T;
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

  const repoUrl = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
  const deployments = await fetchGitHubJson<GitHubDeployment[]>(
    `${repoUrl}/deployments?per_page=20`,
  );

  const previousDeployment = deployments?.find(
    (deployment) => deployment.sha && deployment.sha !== env.KOYEB_GIT_SHA,
  );

  if (!previousDeployment?.sha) {
    return getFallbackCommitTitles();
  }

  const compare = await fetchGitHubJson<GitHubCompareResponse>(
    `${repoUrl}/compare/${previousDeployment.sha}...${env.KOYEB_GIT_SHA}`,
  );
  const titles = compare?.commits
    ?.map((commit) => commit.commit?.message)
    .filter((message): message is string => Boolean(message))
    .map(getCommitTitle);

  return titles?.length ? titles : getFallbackCommitTitles();
};

const buildChangelogLines = (commitTitles: string[]) => {
  if (!commitTitles.length) {
    return ['- No commit message available.'];
  }

  return commitTitles.map((title) => `- ${title}`);
};

const trimMessageToDiscordLimit = (message: string) => {
  if (message.length <= DISCORD_MESSAGE_LIMIT) {
    return message;
  }

  const prefix = message.slice(0, DISCORD_MESSAGE_LIMIT - 32).trimEnd();

  return `${prefix}\n- Changelog truncated.`;
};

const buildDeploymentMessage = (commitTitles: string[]) => {
  const lines = [
    'Dovi deployment finished.',
    'Status: Discord ready',
    env.KOYEB_GIT_BRANCH ? `Branch: ${env.KOYEB_GIT_BRANCH}` : null,
    env.KOYEB_GIT_REPOSITORY ? `Repository: ${env.KOYEB_GIT_REPOSITORY}` : null,
    env.KOYEB_GIT_COMMIT_AUTHOR
      ? `Author: ${env.KOYEB_GIT_COMMIT_AUTHOR}`
      : null,
    '',
    CHANGELOG_HEADER,
    ...buildChangelogLines(commitTitles),
  ].filter((line): line is string => line !== null);

  return trimMessageToDiscordLimit(lines.join('\n'));
};

export const notifyDeploymentReady = async (client: SapphireClient) => {
  if (!env.DEPLOYMENT_NOTIFY_USER_ID) {
    return;
  }

  const commitTitles = await fetchDeploymentCommitTitles();
  const user = await client.users.fetch(env.DEPLOYMENT_NOTIFY_USER_ID);

  await user.send(buildDeploymentMessage(commitTitles));
};
