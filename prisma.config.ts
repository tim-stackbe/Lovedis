import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional (e.g. in CI the URL comes from the environment)
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "tsx --env-file=.env prisma/seed.ts",
  },
});
