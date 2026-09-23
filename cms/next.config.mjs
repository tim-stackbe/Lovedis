import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { withPayload } from '@payloadcms/next/withPayload'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle (.next/standalone/server.js) for the slim
  // Docker/Node runtime on Hetzner — mirrors the platform app's next.config.ts.
  output: 'standalone',
  // This app lives in the monorepo `cms/` subfolder next to the platform. Pin the
  // workspace root so Next doesn't infer the parent repo (and its middleware).
  turbopack: {
    root: dirname,
  },
  // The standalone build traces from this root; include the whole cms folder.
  outputFileTracingRoot: dirname,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
