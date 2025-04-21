#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Install CloudWatch Logs agent for system-level logging
echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing CloudWatch Logs agent"
yum install -y awslogs || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to install CloudWatch Logs agent"
    exit 1
}
systemctl enable awslogsd || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to enable CloudWatch Logs agent"
    exit 1
}
systemctl start awslogsd || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to start CloudWatch Logs agent"
    exit 1
}
