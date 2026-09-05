# syntax=docker/dockerfile:1
#
# Lovedis CMS (Payload 3 / Next.js) — multi-stage standalone build.
# Mirrors the platform Dockerfile: build in CI, run `node server.js` as non-root.

# --- Base -------------------------------------------------------------------
# Debian-slim (glibc) plays nicest with sharp's native/libvips bits.
FROM node:22-slim AS base
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
# --include=dev is required because NODE_ENV=production would otherwise drop the
# devDependencies (typescript, eslint) needed by `next build`.
RUN npm ci --include=dev --ignore-scripts

# --- Builder ----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders. `next build` imports payload.config.ts but never opens
# a DB connection or contacts S3 during the build, so these are not used at runtime.
ENV PAYLOAD_SECRET="build-time-placeholder-secret-not-used-at-runtime"
ENV DATABASE_URI="postgresql://build:build@localhost:5432/build?schema=payload"
ENV DISABLE_S3_STORAGE="true"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runner -----------------------------------------------------------------
FROM base AS runner
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server + static assets + public dir.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
