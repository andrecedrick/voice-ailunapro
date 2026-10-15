# syntax=docker/dockerfile:1
# Multi-stage build
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Install Python and build dependencies for native modules
# This helps with ARM64 builds and native module compilation
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files
COPY ui/package*.json ./

# Clean install with proper handling of native modules
RUN --mount=type=cache,target=/root/.npm npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Install libc6-compat for native modules in builder stage too
RUN apk add --no-cache libc6-compat

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all files needed for build
COPY ui/package*.json ./
COPY ui/tsconfig.json ./
COPY ui/next.config.ts ./
COPY ui/components.json ./
COPY ui/sentry.edge.config.ts ./
COPY ui/sentry.server.config.ts ./
COPY ui/postcss.config.mjs ./
COPY ui/public ./public
COPY ui/src ./src

# BRAND: the design layer and its check. A Dograh upgrade that reverts one of
# the patched files must not be buildable — verify-brand.sh runs before
# `next build` below and fails the image instead of shipping Dograh's look.
# See BRAND.md.
COPY BRAND.md ./BRAND.md
COPY scripts/verify-brand.sh ./scripts/verify-brand.sh

# Set build-time environment variables (needed for Next.js build)
ENV NEXT_PUBLIC_NODE_ENV="oss"
ENV NEXT_TELEMETRY_DISABLED="1"
# BRAND: upstream bakes in Dograh's own Chatwoot workspace, which would put
# their support chat on our customers' screens. Left blank; ChatwootWidget
# renders nothing without a URL. Set these to an AiLunaPro workspace to enable.
ENV NEXT_PUBLIC_CHATWOOT_URL=""
ENV NEXT_PUBLIC_CHATWOOT_TOKEN=""
# BRAND: links to docs.dograh.com are hidden unless we publish our own docs
# here (build with --build-arg NEXT_PUBLIC_DOCS_URL=https://docs.…). BRAND.md §6.
ARG NEXT_PUBLIC_DOCS_URL=""
ENV NEXT_PUBLIC_DOCS_URL=$NEXT_PUBLIC_DOCS_URL
# BRAND: blank = lead forms post to our own API (upstream: Dograh's backend).
ENV NEXT_PUBLIC_ONBOARDING_API_URL=""
ENV BACKEND_URL="http://api:8000"

# Build the application with standalone mode
# Increase Node.js heap size to prevent out-of-memory errors during build
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN sh ./scripts/verify-brand.sh && \
    npm run build && \
    rm -rf /tmp/* /root/.npm /root/.next/cache

# Stage 3: Runner (production image)
FROM node:22-alpine AS runner
WORKDIR /app

# Environment variables will be provided by docker-compose
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose the port Next.js runs on
EXPOSE 3010

# Start the production server using the standalone Node.js server
CMD sh -c "echo '🚀 Application ready at http://localhost:3010' && PORT=3010 node server.js"
