# syntax=docker/dockerfile:1

# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

# Install build tools for better-sqlite3 (needed even if we use pg in prod)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first for layer caching
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

# Install production deps only
COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install --omit=dev && npm cache clean --force

# Copy built artifacts
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

# Create data dir for SQLite (fallback)
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data

USER node
WORKDIR /app/server

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
