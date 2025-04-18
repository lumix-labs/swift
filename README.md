# Swift

Swift is an AI assistant for CxOs and engineering leaders dealing with legacy systems. It helps them understand and act on their codebases without diving into technical complexity.

## Project Structure

- `/web` - Next.js application for user interface
- `/api-server` - API server for backend operations
- `/mcp-server` - MCP server for AI model handling
- `/core` - Shared core libraries
- `/scripts` - Utility scripts for deployment and server setup

## Development

### Prerequisites

- Docker
- Docker Compose
- Node.js 20+
- Python 3.11+

### Setup Development Environment

The project is containerized for consistent development. Use VS Code's dev containers for the best experience.

1. Install [VS Code](https://code.visualstudio.com/)
2. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open this repository in VS Code and click the "Reopen in Container" button

Alternatively, use the provided Makefile:

```bash
# Install dependencies for all modules
make setup-dev

# Start development servers
make dev
```

## Docker Deployment

### Local Development

To build and run with Docker locally:

```bash
# Build and start all services
docker-compose up -d

# Or build specific services
docker-compose up -d web api-server mcp-server
```

### Production Deployment

Swift uses GitHub Actions and AWS ECR for production deployments. The workflow automatically:

1. Detects changes in modules
2. Builds and pushes Docker images to AWS ECR
3. Deploys to production servers
4. Performs cleanup of old images and containers

For detailed setup instructions, see [DEPLOYMENT_SETUP.md](./DEPLOYMENT_SETUP.md).

#### Setting Up a Deployment Server

To set up a new server for deployment:

```bash
# Run the server setup script
sudo ./scripts/setup-deployment-server.sh --key /path/to/github-actions.pub
```

The script installs Docker, Docker Compose, AWS CLI, and configures the deployment user.

## Project Modules

### Web

The web module provides a modern, clean UI for interacting with Swift. It's built with:

- Next.js 14
- TypeScript
- Tailwind CSS

### API Server

The API server handles HTTP requests and business logic:

- Node.js
- Express
- TypeScript

### MCP Server

The MCP server manages AI model integration:

- Node.js
- TypeScript
- Python dependencies for AI model interfaces

## License

See the LICENSE file for details.
