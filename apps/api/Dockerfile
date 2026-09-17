FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma/

# Fail during image build instead of entering a restart loop at runtime.
RUN test -f prisma/migrations/20260917000000_init/migration.sql

RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build --workspace=packages/shared
RUN npx prisma generate
RUN npm run build --workspace=apps/api

FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

RUN PRISMA_GENERATE_SKIP=true npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node apps/api/dist/main.js"]
