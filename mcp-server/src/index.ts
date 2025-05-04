import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';
import { LogLevel, logInfo, logError } from './utils/logFormatter.js';
import { validateClientToolExposure, logClientToolValidation, REQUIRED_CLIENT_TOOLS } from './utils/clientConfig.js';

/**
 * Main entry point for the MCP service
 *
 * This initializes the MCP server and registers all available tools.
 */
async function main() {
  const SERVICE_NAME = 'swift-mcp-service';
  const SERVICE_VERSION = '1.0.0';

  try {
    logInfo('Starting MCP service...', SERVICE_NAME, SERVICE_VERSION);

    // Create a new MCP server instance
    const server = new McpServer({
      name: SERVICE_NAME,
      version: SERVICE_VERSION,
      description: 'Swift MCP Server with various utility tools',
    });

    // Track registered tools manually since McpServer doesn't expose getTools()
    const registeredTools: string[] = [];

    // Register all tools and track them manually
    registerAllTools(server, registeredTools);

    // Verify tool registration for client exposure
    const validationResults = validateClientToolExposure(registeredTools);
    logClientToolValidation(validationResults);

    // If any required tools are missing, log an error but continue startup
    if (!validationResults.allToolsExposed) {
      logError(
        'One or more required tools are not properly registered for client exposure',
        SERVICE_NAME,
        SERVICE_VERSION,
        new Error('Tool registration validation failed'),
        {
          context: {
            missingTools: validationResults.missingTools,
            registeredTools,
          },
        }
      );
    }

    // Create a transport mechanism (using stdio for this example)
    const transport = new StdioServerTransport();

    // Set up error handling for the transport
    process.on('uncaughtException', (error) => {
      logError('Uncaught Exception', SERVICE_NAME, SERVICE_VERSION, error, {
        context: { type: 'uncaughtException' },
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      logError('Unhandled Promise Rejection', SERVICE_NAME, SERVICE_VERSION, error, {
        context: { type: 'unhandledRejection' },
      });
    });

    // Connect the server with the transport
    await server.connect(transport);

    logInfo('MCP service started successfully', SERVICE_NAME, SERVICE_VERSION);
    logInfo(`Available tools: ${registeredTools.join(', ')}`, SERVICE_NAME, SERVICE_VERSION);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError('Failed to start MCP service', SERVICE_NAME, SERVICE_VERSION, err);
    process.exit(1);
  }
}

// Start the application
main();
