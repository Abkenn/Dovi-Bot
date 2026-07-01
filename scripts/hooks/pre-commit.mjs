import { execFileSync } from 'node:child_process';

const run = (command, args) =>
  execFileSync(command, args, { stdio: 'inherit' });

run('pnpm', ['run', 'format']);
run('git', ['add', '-A']);
run('pnpm', ['run', 'test:full']);
