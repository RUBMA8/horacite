import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './tests/globalSetup.js',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 15000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
