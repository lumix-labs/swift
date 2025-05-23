#!/bin/bash
set -e

# Display a message that setup is starting
echo "Starting Swift dev container post-create setup..."

# Verify Terraform installation
echo "Verifying Terraform installation..."
terraform version

# Install global dependencies
echo "Installing global npm packages..."
npm install -g typescript ts-node concurrently

# Install root dependencies and set up husky
echo "Setting up root dependencies and husky hooks..."
cd /workspaces/swift
npm install

# Install web module dependencies
if [ -d "/workspaces/swift/web" ]; then
  echo "Setting up web module..."
  cd /workspaces/swift/web
  npm install
fi

# Install API server dependencies
if [ -d "/workspaces/swift/api-server" ]; then
  echo "Setting up API server module..."
  cd /workspaces/swift/api-server
  npm install
fi

# Install MCP server dependencies
if [ -d "/workspaces/swift/mcp-server" ]; then
  echo "Setting up MCP server module..."
  cd /workspaces/swift/mcp-server
  npm install
  
  # Execute setup script if it exists
  if [ -f "setup.sh" ]; then
    echo "Running MCP server setup script..."
    chmod +x setup.sh
    ./setup.sh
  fi
  
  # Create Python virtual environment for MCP server if needed
  if [ -f "requirements.txt" ]; then
    echo "Setting up Python virtual environment for MCP server..."
    python3 -m venv /home/vscode/venvs/mcp
    source /home/vscode/venvs/mcp/bin/activate
    pip install -r requirements.txt
    deactivate
  fi
fi

# Initialize Terraform if the terraform directory exists
if [ -d "/workspaces/swift/terraform" ]; then
  echo "Initializing Terraform..."
  cd /workspaces/swift/terraform
  terraform init
fi

# Final message
echo "Swift dev container setup complete! You're ready to start coding."
