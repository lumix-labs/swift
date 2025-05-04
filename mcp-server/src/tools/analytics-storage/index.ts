import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StoreAnalyticsTool } from './store-analytics-tool.js';
import { GetAnalyticsTool } from './get-analytics-tool.js';
import { logInfo } from '../../utils/logFormatter.js';

/**
 * Analytics Storage Tools
 *
 * Provides methods to store and retrieve analytics data from tools
 * like repository analyzer and security analyzer in a standardized format.
 *
 * Migrated to use BaseTool architecture for standardized registration
 * and analytics collection.
 */

/**
 * Register the Analytics Storage tools with the MCP server
 */
export function registerAnalyticsStorageTool(server: McpServer) {
  const TOOL_NAME = 'analytics-storage';
  const SERVICE_NAME = 'swift-mcp-service';
  const SERVICE_VERSION = '1.0.0';

  // Create and register the store-analytics tool
  const storeAnalyticsTool = new StoreAnalyticsTool();
  storeAnalyticsTool.register(server);

  // Create and register the get-analytics tool
  const getAnalyticsTool = new GetAnalyticsTool();
  getAnalyticsTool.register(server);

  logInfo(`${TOOL_NAME} tools registered successfully`, SERVICE_NAME, SERVICE_VERSION);
}

// Export tool classes for direct use by other modules
export { StoreAnalyticsTool } from './store-analytics-tool.js';
export { GetAnalyticsTool } from './get-analytics-tool.js';
