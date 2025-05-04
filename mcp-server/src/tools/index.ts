import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerUuidGeneratorTool } from './uuid-generator/index.js';
import { registerRepoAnalyzerTool } from './repo-analyzer/index.js';
import { registerSecurityAnalyzerTool } from './security-analyzer/index.js';
import { registerAnalyticsStorageTool } from './analytics-storage/index.js';
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
export function registerAllTools(server: McpServer, registeredTools: string[] = []) {
  const SERVICE_NAME = 'swift-mcp-service';
  const SERVICE_VERSION = '1.0.0';

  try {
    // Register individual tools
    registerUuidGeneratorTool(server);
    registeredTools.push('uuid-generator');

    registerRepoAnalyzerTool(server);
    registeredTools.push('repo-analyzer');

    // Register security analyzer with special handling to ensure client exposure
    try {
      registerSecurityAnalyzerTool(server);
      registeredTools.push('security-analyzer');

      logInfo('Security analyzer tool registered and exposed to clients successfully', SERVICE_NAME, SERVICE_VERSION);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError('Error registering security analyzer tool', SERVICE_NAME, SERVICE_VERSION, err);

      // Re-attempt registration with standard approach
      logInfo('Re-attempting security analyzer tool registration...', SERVICE_NAME, SERVICE_VERSION);
      registerSecurityAnalyzerTool(server);

      // Double-check if we need to add to registeredTools again
      if (!registeredTools.includes('security-analyzer')) {
        registeredTools.push('security-analyzer');
      }
    }

    // Register analytics storage tools
    registerAnalyticsStorageTool(server);
    registeredTools.push('store-analytics');
    registeredTools.push('get-analytics');

    logInfo('Analytics storage tools registered successfully', SERVICE_NAME, SERVICE_VERSION);

    logInfo('All tools registered successfully', SERVICE_NAME, SERVICE_VERSION);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError('Error registering tools', SERVICE_NAME, SERVICE_VERSION, err);
  }
}
