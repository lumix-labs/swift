#!/bin/bash
set -e

# Setup logging
LOGFILE="/var/log/swift-setup.log"
exec > >(tee -a $LOGFILE) 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Swift infrastructure setup"
echo "$(date '+%Y-%m-%d %H:%M:%S') - AWS Region: ${aws_region}"

# Install Docker and Docker Compose
echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing Docker"
amazon-linux-extras install docker -y
systemctl enable docker
systemctl start docker

echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing Docker Compose"
curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install AWS CLI
echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing AWS CLI"
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Create app directories
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating application directories"
mkdir -p /app/logs/{api,web,mcp-server}
chmod -R 777 /app/logs

# Configure AWS region
echo "$(date '+%Y-%m-%d %H:%M:%S') - Configuring AWS region"
aws configure set region ${aws_region}

# Add user to docker group
echo "$(date '+%Y-%m-%d %H:%M:%S') - Adding ec2-user to docker group"
usermod -aG docker ec2-user

# Create a simple health check endpoint for infrastructure validation
echo "$(date '+%Y-%m-%d %H:%M:%S') - Setting up health check endpoint"
mkdir -p /var/www/html
cat > /var/www/html/index.html << EOL
<!DOCTYPE html>
<html>
<head>
    <title>Swift Instance Health Check</title>
</head>
<body>
    <h1>Swift Infrastructure is Ready</h1>
    <p>This instance is ready for application deployment</p>
    <p>Instance provision time: $(date)</p>
</body>
</html>
EOL

# Install a simple web server for health checks
echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing Nginx for health checks"
amazon-linux-extras install nginx1 -y
systemctl enable nginx
systemctl start nginx

echo "$(date '+%Y-%m-%d %H:%M:%S') - Infrastructure setup completed successfully"
