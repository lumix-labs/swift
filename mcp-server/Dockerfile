FROM node:20-alpine

WORKDIR /app

# Install basic Alpine packages needed for dependency processing
RUN apk add --no-cache python3 py3-pip bash grep

# Create a virtual environment for Python dependencies
ENV VIRTUAL_ENV=/app/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Create logs directory
RUN mkdir -p /logs && chmod 777 /logs

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy source code and configuration
COPY tsconfig.json ./
COPY src/ ./src/

# Setup script to parse and install dependencies from metadata files
COPY setup.sh ./
RUN chmod +x setup.sh

# Find all metadata.yaml/yml files and install their dependencies
RUN find ./src -name "metadata.yaml" -o -name "metadata.yml" | xargs -I{} sh -c '\
    echo "Installing dependencies from {}..." && \
    grep -E "^\s+apt:" {} | sed "s/^\s\+apt:\s\+\"\?//g" | sed "s/\"\?$//g" | xargs -r apk add --no-cache \
    '

# Handle Python dependencies with pip in the virtual environment
RUN find ./src -name "metadata.yaml" -o -name "metadata.yml" | xargs -I{} sh -c '\
    echo "Checking for Python dependencies in {}..." && \
    if grep -q "^\s\+pip:" {}; then \
    grep -E "^\s+pip:" {} | sed "s/^\s\+pip:\s\+\"\?//g" | sed "s/\"\?$//g" | xargs -r pip install; \
    fi \
    ' || echo "No Python dependencies to install or installation failed"

# Build the TypeScript code
RUN npm run build

# Verify build directory exists and contains index.js
RUN ls -la /app/build && \
    ls -la /app/build/index.js

# Expose the service port
EXPOSE 5000

# Volume for logs
VOLUME ["/logs"]

# Command to run the server - use explicit path to avoid confusion
CMD ["node", "/app/build/index.js"]
