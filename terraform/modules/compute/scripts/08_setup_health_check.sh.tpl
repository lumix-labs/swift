#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Add a health check cron job
echo "$(date '+%Y-%m-%d %H:%M:%S') - Setting up health check cron job"
cat > /etc/cron.d/docker-healthcheck << EOL
*/5 * * * * root cd /app && docker-compose ps | grep -q "Exit" && (echo "\$(date '+\%Y-\%m-\%d \%H:\%M:\%S') - Restarting containers" >> $LOGFILE; docker-compose restart) || echo "\$(date '+\%Y-\%m-\%d \%H:\%M:\%S') - Containers running normally" >> $LOGFILE
EOL
chmod 0644 /etc/cron.d/docker-healthcheck

echo "$(date '+%Y-%m-%d %H:%M:%S') - Health check setup completed"
