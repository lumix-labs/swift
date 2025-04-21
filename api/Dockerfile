# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (using npm install instead of npm ci to generate package-lock.json)
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create a non-root user to run the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create and set permissions for logs directory
RUN mkdir -p /logs && chown -R appuser:appgroup /logs

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy build artifacts from builder stage
COPY --from=builder /app/build ./build

# Create a simple dummy server script
RUN echo '#!/bin/sh\nnode -e "const http = require(\"http\"); \
  const server = http.createServer((req, res) => { \
  res.writeHead(200, {\"Content-Type\": \"application/json\"}); \
  res.end(JSON.stringify({message: \"Dummy API server is running\", timestamp: new Date().toISOString()})); \
  }); \
  server.listen(4000, \"0.0.0.0\", () => { \
  console.log(\"Dummy API server running on http://0.0.0.0:4000\"); \
  });"' > /app/dummy-server.sh && chmod +x /app/dummy-server.sh

# Switch user
USER appuser

# Expose API port
EXPOSE 4000

# Volume for logs
VOLUME ["/logs"]

# Command to run the dummy server if build doesn't exist
CMD [ "sh", "-c", "if [ -f \"build/index.js\" ]; then node build/index.js; else /app/dummy-server.sh; fi" ]
