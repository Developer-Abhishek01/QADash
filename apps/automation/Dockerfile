# ========================================
# Stage 1: Base
# ========================================
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat curl wget && \
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
COPY apps/automation/package.json ./apps/automation/
RUN npm ci

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# ========================================
# Stage 3: Builder
# ========================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build --filter=@qadash/automation

# ========================================
# Stage 4: Production Runner
# ========================================
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 automation

WORKDIR /app

COPY --from=builder /app/apps/automation/package.json ./apps/automation/
COPY --from=builder /app/apps/automation/dist ./apps/automation/dist

COPY --from=builder /app/packages/types/dist ./packages/types/
COPY --from=builder /app/packages/utils/dist ./packages/utils/
COPY --from=builder /app/packages/config/dist ./packages/config/
COPY --from=builder /app/packages/logger/dist ./packages/logger/

RUN mkdir -p /app/reports /app/uploads && \
    chown -R automation:nodejs /app
USER automation

CMD ["node", "apps/automation/dist/index.js"]