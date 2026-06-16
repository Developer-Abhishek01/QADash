# ========================================
# Stage 1: Base - Common dependencies
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
COPY apps/frontend/package.json ./apps/frontend/
RUN npm ci

# ========================================
# Stage 3: Builder
# ========================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build --filter=@qadash/frontend

# ========================================
# Stage 4: Production Runner
# ========================================
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder /app/apps/frontend/next.config.js ./apps/frontend/
COPY --from=builder /app/apps/frontend/.next/standalone ./apps/frontend/
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static/

COPY --from=builder /app/packages/types/dist ./packages/types/
COPY --from=builder /app/packages/utils/dist ./packages/utils/

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/frontend/server.js"]