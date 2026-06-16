# ========================================
# Stage 1: Base
# ========================================
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat curl && \
    npm config set fund false && npm config set audit false
WORKDIR /app

# ========================================
# Stage 2: Dependencies
# ========================================
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY packages/logger/package.json ./packages/logger/
COPY apps/backend/package.json ./apps/backend/
RUN npm ci

# ========================================
# Stage 3: Builder
# ========================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build --filter=@qadash/backend

# ========================================
# Stage 4: Production Runner
# ========================================
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

COPY --from=builder /app/packages/types/dist ./packages/types/
COPY --from=builder /app/packages/utils/dist ./packages/utils/
COPY --from=builder /app/packages/config/dist ./packages/config/
COPY --from=builder /app/packages/logger/dist ./packages/logger/

RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001
ENV TZ=UTC

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --spider -q http://localhost:3001/health || exit 1

CMD ["node", "apps/backend/dist/main.js"]