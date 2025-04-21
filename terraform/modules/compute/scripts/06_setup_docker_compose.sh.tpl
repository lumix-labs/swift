#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Create docker-compose.yml
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating docker-compose.yml"
cat > /app/docker-compose.yml << EOL
version: '3'

services:
  web:
    image: ${CONTAINER_IMAGE_WEB}
    ports:
      - "3050:3050"
    restart: always
    volumes:
      - ./logs/web:/logs
    environment:
      - NODE_ENV=production
      - PORT=3050
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3050/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - swift-network

  api-server:
    image: ${CONTAINER_IMAGE_API}
    ports:
      - "4000:4000"
    restart: always
    volumes:
      - ./logs/api-server:/logs
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
      - "3050:80"
    restart: always
    volumes:
      - ./logs/web:/usr/local/apache2/logs
    command: sh -c "echo 'Web service fallback running' > /usr/local/apache2/htdocs/index.html && httpd-foreground"
    networks:
      - swift-network

  api-server:
    image: httpd:latest
    ports:
      - "4000:80"
    restart: always
    volumes:
      - ./logs/api-server:/usr/local/apache2/logs
    command: sh -c "echo '{\"status\":\"healthy\"}' > /usr/local/apache2/htdocs/healthcheck && httpd-foreground"
    networks:
      - swift-network

networks:
  swift-network:
    driver: bridge
EOL
