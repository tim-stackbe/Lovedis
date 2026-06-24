import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
  ],
  // `pg` loads `pg-cloudflare` via a runtime navigator check that @vercel/nft
  // cannot trace, so only `dist/empty.js` is copied while the OpenNext esbuild
  // pass (workerd condition) needs `dist/index.js`. Force both into the trace
  // so `opennextjs-cloudflare build` resolves it. (pg is bundled but unused on
  // the Worker — the Neon adapter is selected there at runtime.)
  outputFileTracingIncludes: {
    "**/*": [
      "./node_modules/pg-cloudflare/dist/**",
      "./node_modules/pg-cloudflare/esm/**",
    ],
  },
};

export default nextConfig;
