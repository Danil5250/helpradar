import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '~': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['{composables,middleware,plugins,server,utils}/**/*.ts'],
      exclude: ['**/*.d.ts'],
      reportsDirectory: './coverage',
      reporter: ['text-summary', 'html', 'lcov'],
    },
  },
});
