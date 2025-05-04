/**
 * MCP Client Configuration Utility
 *
 * This file provides utilities for ensuring all registered tools
 * are properly exposed to MCP clients.
 */
import { logInfo } from './logFormatter.js';

/**
 * List of tool IDs that must be exposed to MCP clients
 */
export const REQUIRED_CLIENT_TOOLS = [
  'uuid-generator',
  'repo-analyzer',
  'security-analyzer', // Ensuring security analyzer is explicitly included
  'store-analytics', // Add analytics storage tools
  'get-analytics',
];

/**
 * Validates that all required tools are exposed to clients
 *
 * @param registeredTools - Array of tool IDs registered with the server
 * @returns Object containing validation results
 */
export function validateClientToolExposure(registeredTools: string[]): {
  allToolsExposed: boolean;
  missingTools: string[];
} {
  const missingTools = REQUIRED_CLIENT_TOOLS.filter((toolId) => !registeredTools.includes(toolId));

  return {
    allToolsExposed: missingTools.length === 0,
    missingTools,
  };
}

/**
 * Logs validation results for client tool exposure
 *
 * @param validationResults - Results from validateClientToolExposure
 */
export function logClientToolValidation(validationResults: { allToolsExposed: boolean; missingTools: string[] }): void {
  const SERVICE_NAME = 'swift-mcp-service';
  const SERVICE_VERSION = '1.0.0';

  if (validationResults.allToolsExposed) {
    logInfo('All required tools are properly exposed to MCP clients', SERVICE_NAME, SERVICE_VERSION);
  } else {
    logInfo(
      `WARNING: Some tools are not exposed to MCP clients: ${validationResults.missingTools.join(', ')}`,
      SERVICE_NAME,
      SERVICE_VERSION,
      {
        context: {
          missingTools: validationResults.missingTools,
        },
      }
    );
  }
}
