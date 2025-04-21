#!/bin/bash
set -e

# Update system
echo "Updating system packages..."
yum update -y

# Install required packages
echo "Installing required packages..."
yum install -y amazon-ssm-agent docker wget jq unzip

# Start and enable SSM agent
echo "Configuring SSM agent..."
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start and enable Docker service
echo "Starting Docker service..."
systemctl enable docker
systemctl start docker

# Create app directory structure
echo "Creating application directory structure..."
mkdir -p /app/logs/{api,web}
chmod -R 777 /app/logs

# Add the ec2-user to the docker group
echo "Configuring Docker permissions..."
usermod -aG docker ec2-user

# AWS CLI v2 installation
echo "Installing AWS CLI v2..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Set region in AWS CLI config
echo "Configuring AWS region..."
mkdir -p /root/.aws
cat > /root/.aws/config << EOF
[default]
region = ${aws_region}
EOF

# Create a deployment status file
echo "Initializing deployment status..."
cat > /app/deployment-status.json << EOF
{
  "initialized": true,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "instance_id": "$(curl -s http://169.254.169.254/latest/meta-data/instance-id)"
}
EOF

echo "EC2 instance initialization completed"
