import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    maxWorkers: 2,
    exclude: [
      '**/.local/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'tests/dal/**',
      'embedded-app/**',
    ],
    coverage: {
      exclude: [
        '**/.local/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        'src/generated/**',
        'tests/**',
        'embedded-app/**',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: true,
      },
    },
  },
});
