import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'src/scripts/',
        '**/*.d.ts',
      ],
    },
    // Run tests sequentially in a single thread
    pool: 'threads',
    threads: {
      singleThread: true,
    },
  },
});
