# Explicitly set platform
ARG VARIANT=ubuntu-22.04
FROM --platform=linux/amd64 mcr.microsoft.com/devcontainers/base:${VARIANT}

# Add platform-specific environment variables
ENV TARGETPLATFORM=linux/amd64
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=development

# Install basic build tools
RUN dpkg --add-architecture amd64 && \
    apt-get update && \
    apt-get install -y \
    build-essential \
    curl \
    git \
    wget \
    gnupg2 \
    lsb-release \
    ca-certificates \
    python3-dev:amd64 \
    python3-venv \
    gcc:amd64 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create directories and set permissions
RUN mkdir -p /home/vscode/.cache/pip && \
    mkdir -p /home/vscode/.local/share && \
    mkdir -p /home/vscode/venvs && \
    mkdir -p /logs && \
    mkdir -p /logs/api-server && \
    mkdir -p /logs/mcp-server && \
    mkdir -p /logs/web && \
    chown -R vscode:vscode /home/vscode && \
    chown -R vscode:vscode /logs

# Set workspace mount consistency
VOLUME [ "/workspace" ]

USER vscode

# Configure git for the container
RUN git config --global core.editor "code --wait"
