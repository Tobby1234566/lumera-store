# syntax=docker/dockerfile:1
#
# Multi-stage build producing a small production image that serves both the
# API and the built storefront from a single origin/port.

# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

# Build tooling needed by better-sqlite3's native module.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first so this layer caches across source changes.
COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install

COPY . .
RUN npm run build


# ── Runtime stage ───────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Production dependencies only.
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

# Writable location for the SQLite file when DB_CLIENT=sqlite.
# Use PostgreSQL in production; this only keeps the default path valid.
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data

USER node
WORKDIR /app/server

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
