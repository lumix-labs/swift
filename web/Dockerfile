FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 3050

# Set environment variable
ENV NODE_ENV=production
ENV PORT=3050

# Start the application
CMD ["npm", "start"]