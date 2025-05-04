import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SecurityAnalyzerTool } from './security-analyzer-tool.js';
import { logInfo } from '../../utils/logFormatter.js';

/**
 * Security Analyzer Tool
 *
 * A tool that analyzes codebases for security vulnerabilities and
 * provides risk scoring with remediation recommendations.
 *
 * Migrated to use BaseTool architecture for standardized registration
 * and analytics collection.
 */

/**
 * Register the Security Analyzer tool with the MCP server
 */
export function registerSecurityAnalyzerTool(server: McpServer) {
  const TOOL_NAME = 'security-analyzer';
  const SERVICE_NAME = 'swift-mcp-service';
  const SERVICE_VERSION = '1.0.0';

  // Create and register the security-analyzer tool
  const securityAnalyzerTool = new SecurityAnalyzerTool();
  securityAnalyzerTool.register(server);

  logInfo(`${TOOL_NAME} tool registered successfully`, SERVICE_NAME, SERVICE_VERSION);
}

// Export the tool class for direct use by other modules
export { SecurityAnalyzerTool } from './security-analyzer-tool.js';

// Re-export the analyzers and utilities for use by other tools
export * from './analyzers/index.js';
export * from './formatters/index.js';
export * from './utils/index.js';
