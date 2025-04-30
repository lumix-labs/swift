import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerUuidGeneratorTool } from './uuid-generator/index.js';
import { registerRepoAnalyzerTool } from './repo-analyzer/index.js';
import { registerSecurityAnalyzerTool } from './security-analyzer/index.js';
import { registerAnalyticsStorageTool } from './analytics-storage/index.js';
import { registerArchitectureAnalyzerTool } from './architecture-analyzer/index.js';
import { logInfo, logError } from '../utils/logFormatter.js';

/**
 * Register all tools with the MCP server
 *
 * This function is the central place to register all tools
 * with the MCP server. Import and register new tools here.
 *
 * @param server - The MCP server instance
 * @param registeredTools - Array to track registered tool names
 */
export function registerAllTools(server: McpServer, registeredTools?: string[]): void {
  // Register existing tools
  registerUuidGeneratorTool(server);
  registeredTools?.push('uuid-generator');

  registerRepoAnalyzerTool(server);
  registeredTools?.push('repo-analyzer');

  registerSecurityAnalyzerTool(server);
  registeredTools?.push('security-analyzer');

  registerAnalyticsStorageTool(server);
  registeredTools?.push('store-analytics');
  registeredTools?.push('get-analytics');

  // Register the new tool
  registerArchitectureAnalyzerTool(server);
  registeredTools?.push('architecture-analyzer');

  logInfo('All tools registered successfully', 'swift-mcp-service', '1.0.0');
}
