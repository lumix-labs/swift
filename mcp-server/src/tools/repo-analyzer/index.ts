import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RepoAnalyzerTool } from './repo-analyzer-tool.js';
import { logInfo } from '../../utils/logFormatter.js';

/**
 * Repository Analyzer Tool
 *
 * A tool that analyzes repository structure and composition,
 * providing insights into language distribution, code organization,
 * and other metrics useful for technical leadership.
 *
 * Migrated to use BaseTool architecture for standardized registration
 * and analytics collection.
 */

/**
 * Register the Repository Analyzer tool with the MCP server
 */
export function registerRepoAnalyzerTool(server: McpServer) {
  const TOOL_NAME = 'repo-analyzer';
  const SERVICE_NAME = 'swift-mcp-service';
  const SERVICE_VERSION = '1.0.0';

  // Create and register the repo-analyzer tool
  const repoAnalyzerTool = new RepoAnalyzerTool();
  repoAnalyzerTool.register(server);

  logInfo(`${TOOL_NAME} tool registered successfully`, SERVICE_NAME, SERVICE_VERSION);
}

// Export the tool class for direct use by other modules
export { RepoAnalyzerTool } from './repo-analyzer-tool.js';

// Re-export the analyzers for use by other tools
export * from './analyzers/index.js';
