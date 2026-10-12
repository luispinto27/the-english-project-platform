import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // lib/db/schema.test.ts and lib/bookings.test.ts both exercise a single
    // shared Postgres database (DATABASE_URL_TEST) with cross-file TRUNCATEs;
    // running test files in parallel (Vitest's default) lets one file's
    // TRUNCATE/insert race another's, causing spurious pass/fail flips.
    fileParallelism: false,
  },
});
