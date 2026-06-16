# ========================================
# Stage 1: Base
# ========================================
FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --upgrade pip

WORKDIR /app

# ========================================
# Stage 2: Dependencies
# ========================================
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ========================================
# Stage 3: Builder
# ========================================
FROM base AS builder
RUN pip install --no-cache-dir uvicorn[standard]==0.27.0
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . .

# ========================================
# Stage 4: Production Runner
# ========================================
FROM base AS runner
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN groupadd -r aiengine && \
    useradd -r -g aiengine aiengine && \
    mkdir -p /app && chown -R aiengine:aiengine /app

COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY --from=builder /app /app

USER aiengine

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl --fail http://localhost:3002/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3002", "--workers", "2"]