# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Swift is a mono-repo containing three main components:
- **MCP Server** (`mcp-server/`): Model Context Protocol server providing tools for repository analysis, security scanning, and utilities
- **Web Application** (`web/`): Next.js frontend for the Swift application
- **API Server** (`api/`): Express.js backend API server

The project is designed to help engineering teams analyze legacy codebases and modernize them incrementally.

## Development Commands

### Root Level Commands
```bash
# Install dependencies for all workspaces
npm install

# Development servers
npm run dev:web      # Start Next.js dev server on port 80
npm run dev:api      # Start API server in development mode
npm run dev:mcp      # Start MCP server in watch mode

# Production builds
npm run build:web    # Build Next.js application
npm run build:api    # Build API server TypeScript
npm run build:mcp    # Build MCP server TypeScript

# Linting and formatting
npm run lint:web     # Lint web application
npm run lint:api     # Lint API server
npm run lint:mcp     # Lint MCP server
npm run format:web   # Format web application code
npm run format:api   # Format API server code
npm run format:mcp   # Format MCP server code

# Docker operations
npm run docker:up    # Start all services with docker-compose
npm run docker:down  # Stop all services
npm run docker:build # Build all Docker images
npm run docker:logs  # View logs from all services

# CI/Quality checks
npm run ci           # Run local CI checks
npm run terraform:validate  # Validate Terraform configuration
```

### Component-Specific Commands

#### Web Application (`web/`)
```bash
cd web
npm run dev          # Development server on port 80
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run format       # Prettier formatting
npm run test         # Currently returns success (no tests configured)
```

#### API Server (`api/`)
```bash
cd api
npm run build        # TypeScript compilation
npm run start        # Start production server
npm run dev          # Development with watch mode
npm run lint         # ESLint
```

#### MCP Server (`mcp-server/`)
```bash
cd mcp-server
npm run build        # TypeScript compilation
npm run start        # Start server
npm run dev          # Development with TypeScript watch
npm run lint         # ESLint
npm run format       # Prettier formatting
./build.sh           # Build Docker image
```

## Architecture

### MCP Server Tools
The MCP server provides several analysis tools:

- **Repository Analyzer** (`src/tools/repo-analyzer/`): Analyzes codebase structure, language distribution, and code quality metrics
- **Security Analyzer** (`src/tools/security-analyzer/`): Scans for vulnerabilities, credentials, and security issues
- **Analytics Storage** (`src/tools/analytics-storage/`): Collects and stores analysis data
- **UUID Generator** (`src/tools/uuid-generator/`): Generates UUIDs in various formats

### Web Application Structure
- **Components** (`src/app/components/`): Organized by feature areas (chat, header, hero, etc.)
- **Context Providers** (`src/app/context/`): React context for state management
- **Services** (`src/app/lib/services/`): API service layer with model service factory pattern
- **Hooks** (`src/app/hooks/`): Custom React hooks organized by feature

### Key Patterns
- Monorepo structure with npm workspaces
- TypeScript throughout
- Docker containerization for all services
- Model Context Protocol for tool integration
- Service factory pattern for AI model providers

## Testing

- Web application: No tests currently configured (`npm run test` returns success)
- API server: No test configuration found
- MCP server: No test configuration found

## Docker Integration

The project uses Docker extensively:
- Each component has its own Dockerfile
- `docker-compose.yml` orchestrates all services
- MCP server is designed to run in Docker containers for Claude Desktop integration

## Git Hooks

The project uses Husky for git hooks with:
- Commitlint for conventional commit messages
- Lint-staged for pre-commit formatting and linting across all workspaces

## Terraform Infrastructure

Infrastructure code is in `terraform/` with modules for:
- Networking
- Compute resources
- Security groups
- Cloudflare integration

Use `npm run terraform:validate` to validate configuration.