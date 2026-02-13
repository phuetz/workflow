# ============================================
# WORKFLOW AUTOMATION PLATFORM - PRODUCTION DOCKERFILE
# Multi-stage build for optimal size and security
# ============================================

# ============================================
# Stage 1: Base Dependencies
# ============================================
FROM node:20-alpine AS deps
LABEL stage=deps

# Install necessary build tools
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with clean cache
RUN npm ci --frozen-lockfile --production=false && \
    npm cache clean --force

# ============================================
# Stage 2: Builder (Frontend + Backend)
# ============================================
FROM node:20-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Copy source code
COPY . .

# Set build-time environment variables
ARG NODE_ENV=production
ARG VITE_API_BASE_URL
ARG VITE_GRAPHQL_URL
ARG VITE_WS_URL

ENV NODE_ENV=$NODE_ENV
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://api.workflow-automation.com}
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL:-https://api.workflow-automation.com/graphql}
ENV VITE_WS_URL=${VITE_WS_URL:-wss://api.workflow-automation.com/ws}

# Build application (TypeScript backend + Vite frontend)
RUN npm run build

# Prune dev dependencies
RUN npm prune --production && \
    npm cache clean --force

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner
LABEL maintainer="Workflow Platform Team"
LABEL version="2.0.0"
LABEL description="Production-ready workflow automation platform"

WORKDIR /app

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    curl \
    tini \
    dumb-init \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs workflow

# Copy built application from builder
COPY --from=builder --chown=workflow:nodejs /app/dist ./dist
COPY --from=builder --chown=workflow:nodejs /app/public ./public
COPY --from=builder --chown=workflow:nodejs /app/package.json ./
COPY --from=builder --chown=workflow:nodejs /app/node_modules ./node_modules

# Copy Prisma schema if exists (for migrations)
COPY --from=builder --chown=workflow:nodejs /app/prisma ./prisma 2>/dev/null || true

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R workflow:nodejs /app/logs /app/uploads /app/temp && \
    chmod -R 755 /app

# Security: Remove unnecessary files
RUN find /app -name "*.test.ts" -delete && \
    find /app -name "*.test.tsx" -delete && \
    find /app -name "*.spec.ts" -delete && \
    find /app -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true

# Set proper file permissions
RUN chmod -R 555 /app/dist && \
    chmod -R 555 /app/node_modules

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

# Switch to non-root user
USER workflow

# Expose ports
EXPOSE 3000 3001 3002

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Use tini for proper signal handling and zombie reaping
ENTRYPOINT ["/sbin/tini", "--"]

# Start the backend API server
CMD ["node", "dist/src/backend/api/server.js"]

# ============================================
# Stage 4: Development
# ============================================
FROM node:20-alpine AS development
LABEL stage=development

WORKDIR /app

# Install development tools
RUN apk add --no-cache \
    git \
    curl \
    vim \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 3000 3001 3002

# Development command
CMD ["npm", "run", "dev"]

# ============================================
# Stage 5: Testing
# ============================================
FROM builder AS testing
LABEL stage=testing

WORKDIR /app

# Install testing dependencies if not present
RUN npm install --include=dev

# Copy test files
COPY --from=builder /app/src/__tests__ ./src/__tests__
COPY --from=builder /app/vitest.config.ts ./
COPY --from=builder /app/vitest.integration.config.ts ./
COPY --from=builder /app/playwright.config.ts ./

# Run tests
CMD ["npm", "run", "test"]
