# syntax=docker/dockerfile:1

# --- Base -------------------------------------------------------------------
# Debian-slim (glibc) plays nicest with Prisma's native/OpenSSL bits.
FROM node:22-slim AS base
ENV NODE_ENV=production
# Prisma / OpenSSL runtime dependency.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Dependencies -----------------------------------------------------------
FROM base AS deps
# Install full deps (incl. dev) for the build. Use the lockfile for repeatable
# installs. Ignore lifecycle scripts here — Prisma generate runs in the builder.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# --- Builder ----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders: `next build` imports modules that instantiate the
# Prisma client and NextAuth at import time. These are NOT used at runtime and
# no DB connection is opened during the build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV NEXTAUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime"
ENV AUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime"
ENV AUTH_TRUST_HOST="true"
ENV NEXT_TELEMETRY_DISABLED=1
# `npm run build` == `prisma generate && next build` (see package.json).
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

# Next.js standalone entrypoint.
CMD ["node", "server.js"]
