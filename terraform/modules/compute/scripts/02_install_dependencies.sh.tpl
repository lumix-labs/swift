#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Update packages
echo "$(date '+%Y-%m-%d %H:%M:%S') - Updating system packages"
yum update -y || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to update packages"
    exit 1
}

# Install Docker
echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing Docker"
amazon-linux-extras install docker -y || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to install Docker"
    exit 1
}

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Docker service"
systemctl start docker || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to start Docker service"
    exit 1
}
systemctl enable docker || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to enable Docker service"
    exit 1
}
usermod -a -G docker ec2-user || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to add ec2-user to docker group"
    exit 1
}

# Install Docker Compose
echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing Docker Compose"
curl -L "https://github.com/docker/compose/releases/download/v2.16.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to download Docker Compose"
    exit 1
}
chmod +x /usr/local/bin/docker-compose || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to set executable permissions on Docker Compose"
    exit 1
}
echo "$(date '+%Y-%m-%d %H:%M:%S') - Docker Compose version: $(docker-compose version)"

# Check AWS CLI installation
echo "$(date '+%Y-%m-%d %H:%M:%S') - AWS CLI is already installed: $(aws --version)"
