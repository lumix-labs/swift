/**
 * UUID Generator Tool Index
 *
 * Exports the UUID generator tool and registration function
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { UuidGeneratorTool } from '../uuid-generator.js';

/**
 * Register the UUID Generator tool with the MCP server
 */
export function registerUuidGeneratorTool(server: McpServer): void {
  const tool = new UuidGeneratorTool();
  tool.register(server);
}

/**
 * Export the UUID Generator tool class
 */
export { UuidGeneratorTool } from '../uuid-generator.js';
