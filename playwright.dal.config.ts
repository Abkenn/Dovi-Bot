import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/dal',
  testMatch: '**/*.spec.ts',
  reporter: 'list',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
});
