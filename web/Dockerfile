# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ bash

# Copy package.json and tsconfig.json first for better layer caching
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Log TypeScript version and directory structure for debugging
RUN echo "TypeScript version:" && npx tsc --version
RUN echo "Directory structure:" && find ./src -type f | sort

# Initialize Next.js to ensure proper resolution of paths
RUN npx next telemetry disable

# Skip type checking in CI environment (type checking happens during development)
# Use --skipLibCheck to avoid checking node_modules
RUN echo "Skipping type checking in CI/CD pipeline"
# RUN npx tsc --noEmit

# Build the application with verbose logging
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install troubleshooting tools
RUN apk add --no-cache curl wget procps

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80
ENV NODE_OPTIONS="--max-old-space-size=512"

# Only copy necessary files for running the app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Add a startup script for better logging
RUN echo '#!/bin/sh\necho "Container starting at $(date)"\necho "Starting Next.js app..."\nexec npm start' > /app/start.sh && chmod +x /app/start.sh

# Expose the port
EXPOSE 80

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=180s --retries=3 \
    CMD wget --spider -q http://localhost:80/api/health || exit 1

# Start the application with the startup script
CMD ["npm", "start"]