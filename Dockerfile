# ===========================================
# TEXLINK Frontend - Multi-stage Dockerfile
# Optimized for Railway deployment
# ===========================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_MOCK_MODE=false
ARG VITE_APP_NAME=Texlink

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MOCK_MODE=$VITE_MOCK_MODE
ENV VITE_APP_NAME=$VITE_APP_NAME

# Build the application
RUN npm run build

# Stage 3: Production - Nginx
FROM nginx:alpine AS runner

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy custom nginx config template
COPY nginx/nginx.conf /etc/nginx/nginx.conf.template

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create startup script that substitutes PORT/BACKEND_URL and starts nginx
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'export PORT=${PORT:-8080}' >> /docker-entrypoint.sh && \
    echo 'export BACKEND_URL=${BACKEND_URL:-http://localhost:3000}' >> /docker-entrypoint.sh && \
    echo 'echo "Starting nginx with PORT=$PORT BACKEND_URL=$BACKEND_URL"' >> /docker-entrypoint.sh && \
    echo 'envsubst "\$PORT \$BACKEND_URL" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose port (Railway will override with PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Start nginx with environment variable substitution
CMD ["/docker-entrypoint.sh"]
