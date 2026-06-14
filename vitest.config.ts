import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'tests/dal/**',
    ],
    coverage: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        'src/generated/**',
        'tests/**',
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
