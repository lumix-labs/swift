#!/bin/bash
set -e

# Update system
echo "Updating system packages..."
yum update -y

# Install required packages
echo "Installing required packages..."
yum install -y wget jq unzip amazon-ssm-agent

# Make sure SSM agent is properly installed and running
echo "Ensuring SSM agent is running..."
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Install Docker
echo "Installing Docker..."
amazon-linux-extras install docker -y
systemctl enable docker
systemctl start docker

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory structure
echo "Creating application directory structure..."
mkdir -p /app/logs/{api,web}
chmod -R 777 /app/logs

# Add ec2-user to the docker group
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

# Create a marker file to indicate successful initialization
echo "Creating initialization marker..."
cat > /app/instance-info.json << EOF
{
  "initialized": true,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "instance_id": "$(curl -s http://169.254.169.254/latest/meta-data/instance-id)",
  "region": "${aws_region}",
  "public_ip": "$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)",
  "ssm_status": "$(systemctl is-active amazon-ssm-agent)"
}
EOF

echo "EC2 instance initialization completed successfully"