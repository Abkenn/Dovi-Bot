import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const discordClientId =
    process.env.DISCORD_CLIENT_ID ?? env.DISCORD_CLIENT_ID ?? '';

  return {
    root: 'embedded-app',
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __DISCORD_CLIENT_ID__: JSON.stringify(discordClientId),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      proxy: {
        '/api': 'http://localhost:8000',
      },
    },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      maxWorkers: 2,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.types.ts'],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
          perFile: true,
        },
      },
    },
  };
});
