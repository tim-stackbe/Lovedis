import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal OpenNext config for deploying this Next.js app to Cloudflare Workers.
// Caching defaults to in-memory; switch to R2/KV/D1 incremental cache here if
// ISR / "use cache" / on-demand revalidation is needed in production.
export default defineCloudflareConfig();
