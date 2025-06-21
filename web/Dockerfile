# Build stage2
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install before copying the rest for better caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80

# Copy only necessary files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Expose the port
EXPOSE 80

# Start the application
CMD ["npm", "start"]
