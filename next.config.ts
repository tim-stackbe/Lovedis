import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone/server.js) for the
  // slim Docker/Node runtime used by the Hetzner deploy. Harmless for the
  // Cloudflare/OpenNext build, which reads .next independently.
  output: "standalone",
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
  ],
  outputFileTracingIncludes: {
    "**/*": [
      "./node_modules/pg-cloudflare/dist/**",
      "./node_modules/pg-cloudflare/esm/**",
      // Prisma 7 generated client + WASM query compiler live outside
      // node_modules; ensure they land in the standalone output.
      "./src/generated/prisma/**",
    ],
  },
};

export default nextConfig;
