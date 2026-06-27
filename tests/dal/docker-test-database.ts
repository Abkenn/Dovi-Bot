const DATABASE_URL_PREFIX = 'postgresql://postgres:postgres@127.0.0.1:';
const DATABASE_NAME = 'dovi_bot_dal_test';

export const buildDockerTestDatabaseUrl = (portOutput: string): string => {
  const endpoint = portOutput.trim().split('\n')[0]?.trim() ?? '';
  const separatorIndex = endpoint.lastIndexOf(':');
  const port = Number(endpoint.slice(separatorIndex + 1));

  if (separatorIndex === -1 || !Number.isInteger(port) || port <= 0) {
    throw new Error('Could not determine the DAL test PostgreSQL port.');
  }

  return `${DATABASE_URL_PREFIX}${port}/${DATABASE_NAME}`;
};
