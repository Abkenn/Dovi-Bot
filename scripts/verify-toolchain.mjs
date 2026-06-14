import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const expected = packageJson.engines;

const commandVersion = (command) =>
  execFileSync(command, ['--version'], { encoding: 'utf8' })
    .trim()
    .replace(/^v/, '');

const actual = {
  node: process.version.replace(/^v/, ''),
  pnpm: commandVersion('pnpm'),
};

const mismatches = Object.entries(expected).filter(
  ([tool, version]) => actual[tool] !== version,
);

if (mismatches.length > 0) {
  console.error('Toolchain version mismatch:');

  for (const [tool, version] of mismatches) {
    console.error(`- ${tool}: expected ${version}, got ${actual[tool]}`);
  }

  process.exit(1);
}

console.log(`Toolchain OK: node ${actual.node}, pnpm ${actual.pnpm}`);
