import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDockerTestDatabaseUrl } from './docker-test-database';

const CONTAINER_NAME = 'dovi-bot-dal-test-postgres';
const WINDOWS_DOCKER_EXE =
  'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
const RUNTIME_ENV_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '.runtime-env.json',
);

type RuntimeEnv = {
  databaseUrl: string | null;
  skipReason: string | null;
};

const writeRuntimeEnv = (runtimeEnv: RuntimeEnv) => {
  writeFileSync(RUNTIME_ENV_PATH, `${JSON.stringify(runtimeEnv, null, 2)}\n`);
};

const missingDatabaseMessage = [
  'DAL integration tests require a disposable PostgreSQL database.',
  '',
  'Start Docker Desktop and rerun:',
  '  pnpm run test:dal',
  '',
  'Or provide your own throwaway database:',
  "  $env:DAL_TEST_DATABASE_URL='postgresql://user:password@localhost:5432/dovi_bot_test'",
  '  pnpm run test:dal',
  '',
  'Only skip explicitly with DAL_TEST_SKIP=true.',
].join('\n');

const run = (
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; stdio?: 'ignore' | 'inherit' } = {},
) =>
  execFileSync(command, args, {
    cwd: resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
    env: options.env,
    stdio: options.stdio ?? 'ignore',
  });

const capture = (command: string, args: string[]): string =>
  execFileSync(command, args, {
    cwd: resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
    encoding: 'utf8',
  }).trim();

const hasDocker = () => {
  try {
    run(resolveDockerCommand(), ['info']);
    return true;
  } catch {
    return false;
  }
};

const resolveDockerCommand = () => {
  if (existsSync(WINDOWS_DOCKER_EXE)) {
    return WINDOWS_DOCKER_EXE;
  }

  return 'docker';
};

const removeTestContainer = () => {
  try {
    run(resolveDockerCommand(), ['rm', '-f', CONTAINER_NAME]);
  } catch {
    return;
  }
};

const waitForPostgres = () => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      run(resolveDockerCommand(), [
        'exec',
        CONTAINER_NAME,
        'pg_isready',
        '-U',
        'postgres',
        '-d',
        'dovi_bot_dal_test',
      ]);
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }

  throw new Error('Timed out waiting for DAL test PostgreSQL container.');
};

const pushPrismaSchema = (databaseUrl: string) => {
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };

  run('pnpm', ['exec', 'prisma', 'db', 'push'], {
    env,
    stdio: 'inherit',
  });
};

export default async () => {
  const providedDatabaseUrl = process.env.DAL_TEST_DATABASE_URL;

  if (process.env.DAL_TEST_SKIP === 'true') {
    writeRuntimeEnv({
      databaseUrl: null,
      skipReason: 'DAL_TEST_SKIP=true was set.',
    });
    return;
  }

  if (providedDatabaseUrl) {
    pushPrismaSchema(providedDatabaseUrl);
    writeRuntimeEnv({ databaseUrl: providedDatabaseUrl, skipReason: null });
    return;
  }

  if (!hasDocker()) {
    throw new Error(missingDatabaseMessage);
  }

  removeTestContainer();

  try {
    run(
      resolveDockerCommand(),
      [
        'run',
        '--name',
        CONTAINER_NAME,
        '-e',
        'POSTGRES_PASSWORD=postgres',
        '-e',
        'POSTGRES_DB=dovi_bot_dal_test',
        '-p',
        '127.0.0.1::5432',
        '-d',
        'postgres:16-alpine',
      ],
      { stdio: 'inherit' },
    );

    waitForPostgres();
    const databaseUrl = buildDockerTestDatabaseUrl(
      capture(resolveDockerCommand(), ['port', CONTAINER_NAME, '5432/tcp']),
    );
    pushPrismaSchema(databaseUrl);
    writeRuntimeEnv({ databaseUrl, skipReason: null });
  } catch (error) {
    removeTestContainer();
    throw error;
  }

  return async () => {
    if (process.env.DAL_TEST_KEEP_CONTAINER === 'true') {
      return;
    }

    if (existsSync(RUNTIME_ENV_PATH)) {
      removeTestContainer();
    }
  };
};
