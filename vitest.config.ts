import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Local-only test database. NEVER point the suite at the Neon prod/preview DB.
// Integration tests additionally assert (in tests/helpers/db.ts) that the URL
// is a localhost `_test` database before touching it, as a second safety net.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://lovedis:lovedis@localhost:5433/lovedis_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: false,
    // File-level isolation keeps the Prisma singleton and module mocks from
    // leaking between test files.
    isolate: true,
    // Integration tests share a single local Postgres and TRUNCATE between
    // tests, so files must not run concurrently against the same database.
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: "test",
    },
  },
});
