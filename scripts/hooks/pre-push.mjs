import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const run = (command, args, timeoutMs) =>
  execFileSync(command, args, {
    stdio: 'ignore',
    timeout: timeoutMs,
  });

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

try {
  run(dockerCommand, ['info'], 5_000);
} catch {
  console.error('docker not running');
  process.exit(1);
}

run('pnpm', ['run', 'test:dal']);
