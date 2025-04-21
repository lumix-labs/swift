#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Source environment exports if available
if [ -f "/tmp/aws-env-exports.sh" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Sourcing environment exports" 
    source /tmp/aws-env-exports.sh
fi

# Debug: Print environment variables to verify
echo "$(date '+%Y-%m-%d %H:%M:%S') - Using container images:"
echo "API: ${CONTAINER_IMAGE_API}"
echo "Web: ${CONTAINER_IMAGE_WEB}"

# Create docker-compose.yml
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating docker-compose.yml"
cat > /app/docker-compose.yml << EOL
version: '3'

services:
  web:
    image: ${CONTAINER_IMAGE_WEB}
    ports:
      - "80:80"
    restart: always
    volumes:
      - ./logs/web:/logs
    environment:
      - NODE_ENV=production
      - PORT=80
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - swift-network

  api:
    image: ${CONTAINER_IMAGE_API}
    ports:
      - "4000:4000"
    restart: always
    volumes:
      - ./logs/api:/logs
    environment:
      - NODE_ENV=production
      - PORT=4000
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:4000/healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - swift-network

networks:
  swift-network:
    driver: bridge
EOL

# Create fallback docker-compose file (will only be used if primary fails)
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating fallback docker-compose.yml"
cat > /app/docker-compose-fallback.yml << EOL
version: '3'

services:
  web:
    image: httpd:latest
    ports:
      - "80:80"
    restart: always
    volumes:
      - ./logs/web:/usr/local/apache2/logs
    command: sh -c "echo 'Web service fallback running' > /usr/local/apache2/htdocs/index.html && httpd-foreground"
    networks:
      - swift-network

  api:
    image: httpd:latest
    ports:
      - "4000:80"
    restart: always
    volumes:
      - ./logs/api:/usr/local/apache2/logs
    command: sh -c "echo '{\"status\":\"healthy\"}' > /usr/local/apache2/htdocs/healthcheck && httpd-foreground"
    networks:
      - swift-network

networks:
  swift-network:
    driver: bridge
EOL

# Create a script to manually build and push images if they don't exist
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating manual image build script"
cat > /app/build-images.sh << EOL
#!/bin/bash
set -e

echo "Swift docker image build script"
echo "==============================="

# API Server Build
echo "Building API Server image..."
mkdir -p /tmp/swift-api
cd /tmp/swift-api

# Create a simple Dockerfile for API server
cat > Dockerfile << 'INNEREOF'
FROM node:20-alpine

WORKDIR /app
RUN mkdir -p /logs && chmod 777 /logs

# Create a simple express server
RUN npm init -y && \\
    npm install express

# Create a simple server.js file
RUN echo 'const express = require("express"); \\
const app = express(); \\
const port = process.env.PORT || 4000; \\
\\
app.get("/", (req, res) => { \\
  res.json({ message: "API server is running", timestamp: new Date() }); \\
}); \\
\\
app.get("/healthcheck", (req, res) => { \\
  res.json({ status: "healthy" }); \\
}); \\
\\
app.listen(port, () => { \\
  console.log(`API server listening at http://localhost:\${port}`); \\
});' > server.js

EXPOSE 4000
VOLUME ["/logs"]
CMD ["node", "server.js"]
INNEREOF

echo "Building API image..."
docker build -t swift-api:latest .

# Web Server Build
echo "Building Web Server image..."
mkdir -p /tmp/swift-web
cd /tmp/swift-web

# Create a simple Dockerfile for Web server
cat > Dockerfile << 'INNEREOF'
FROM node:20-alpine

WORKDIR /app
RUN mkdir -p /logs && chmod 777 /logs

# Create a simple static web server
RUN npm init -y && \\
    npm install express

# Create index.html
RUN mkdir -p public && \\
    echo '<html><head><title>Swift Web App</title></head><body><h1>Swift Web Application</h1><p>This is a fallback static website</p></body></html>' > public/index.html

# Create a simple server.js file
RUN echo 'const express = require("express"); \\
const app = express(); \\
const port = process.env.PORT || 80; \\
\\
app.use(express.static("public")); \\
\\
app.get("/api/health", (req, res) => { \\
  res.json({ status: "healthy" }); \\
}); \\
\\
app.listen(port, () => { \\
  console.log(`Web server listening at http://localhost:\${port}`); \\
});' > server.js

EXPOSE 80
VOLUME ["/logs"]
CMD ["node", "server.js"]
INNEREOF

echo "Building Web image..."
docker build -t swift-web:latest .

# Update docker-compose.yml with local images
echo "Updating docker-compose.yml to use local images..."
cd /app

cat > docker-compose-local.yml << 'INNEREOF'
version: '3'

services:
  web:
    image: swift-web:latest
    ports:
      - "80:80"
    restart: always
    volumes:
      - ./logs/web:/logs
    environment:
      - NODE_ENV=production
      - PORT=80
    networks:
      - swift-network

  api:
    image: swift-api:latest
    ports:
      - "4000:4000"
    restart: always
    volumes:
      - ./logs/api:/logs
    environment:
      - NODE_ENV=production
      - PORT=4000
    networks:
      - swift-network

networks:
  swift-network:
    driver: bridge
INNEREOF

echo "Done! To use local images, run:"
echo "cd /app && docker-compose -f docker-compose-local.yml up -d"
EOL

chmod +x /app/build-images.sh
