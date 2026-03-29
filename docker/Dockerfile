# ── builder ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Native module build deps (required by better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npm ci

# Generate Prisma client
RUN DATABASE_URL="file:./prisma/dev.db" node_modules/.bin/prisma generate

COPY . .
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install production deps (includes prisma + better-sqlite3, rebuilt for this image)
COPY package*.json ./
RUN npm ci --omit=dev

# Install Prisma CLI globally for migrations only
RUN npm install -g prisma

# Copy prisma schema, migrations, and config for deploy
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy built Next.js output and generated Prisma client
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/app/generated ./app/generated

# Entrypoint
COPY docker/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p /data && chown -R appuser:appgroup /app /data
USER appuser

EXPOSE 3000

# /data is the volume mount point for the SQLite database
VOLUME ["/data"]

CMD ["./docker-entrypoint.sh"]
