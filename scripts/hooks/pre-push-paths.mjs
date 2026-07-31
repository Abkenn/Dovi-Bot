const DAL_FILE_PATHS = new Set([
  'playwright.dal.config.ts',
  'prisma.config.ts',
  'prisma/schema.prisma',
  'src/lib/prisma.ts',
]);

const DAL_DIRECTORY_PREFIXES = ['src/data/', 'tests/dal/'];

export const shouldRunDalTests = (paths) =>
  paths.some(
    (path) =>
      DAL_FILE_PATHS.has(path) ||
      DAL_DIRECTORY_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
