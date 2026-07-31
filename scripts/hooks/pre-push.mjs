import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { shouldRunDalTests } from './pre-push-paths.mjs';

const ZERO_SHA = '0'.repeat(40);

const run = (command, args, timeoutMs) =>
  execFileSync(command, args, {
    stdio: 'ignore',
    timeout: timeoutMs,
  });

const runForOutput = (command, args, timeoutMs) =>
  execFileSync(command, args, {
    encoding: 'utf8',
    timeout: timeoutMs,
  });

const getPushedPaths = () => {
  const updates = readFileSync(0, 'utf8')
    .trim()
    .split('\n')
    .map((line) => line.trim().split(' ').filter(Boolean))
    .filter((parts) => parts.length === 4);
  const paths = new Set();

  for (const [, localSha, , remoteSha] of updates) {
    if (!localSha || localSha === ZERO_SHA) {
      continue;
    }

    const args =
      remoteSha === ZERO_SHA
        ? ['ls-tree', '-r', '--name-only', localSha]
        : ['diff', '--name-only', remoteSha, localSha];
    const output = runForOutput('git', args, 30_000);

    for (const path of output.split('\n')) {
      if (path) {
        paths.add(path);
      }
    }
  }

  return [...paths];
};

const getDockerCommand = () => {
  const candidates = [
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
    process.env.LOCALAPPDATA
      ? resolve(
          process.env.LOCALAPPDATA,
          'Docker',
          'Desktop',
          'resources',
          'bin',
          'docker.exe',
        )
      : null,
    process.env.APPDATA
      ? resolve(
          process.env.APPDATA,
          'Docker',
          'Desktop',
          'resources',
          'bin',
          'docker.exe',
        )
      : null,
    'docker',
  ];

  return candidates.find((candidate) =>
    candidate ? existsSync(candidate) || candidate === 'docker' : false,
  );
};

const dockerCommand = getDockerCommand() ?? 'docker';
const pushedPaths = getPushedPaths();

try {
  run('pnpm', ['run', 'db:migrate:status'], 30_000);
  run('pnpm', ['run', 'db:schema:diff'], 30_000);
} catch {
  console.error(
    'Supabase has pending migrations or schema drift. Run pnpm run db:migrate:deploy, then retry.',
  );
  process.exit(1);
}

if (shouldRunDalTests(pushedPaths)) {
  try {
    run(dockerCommand, ['info'], 5_000);
  } catch {
    console.error('docker not running; DAL changes require pnpm run test:dal');
    process.exit(1);
  }

  run('pnpm', ['run', 'test:dal']);
} else {
  console.log('No DAL changes detected; skipping Docker-backed DAL tests.');
}
