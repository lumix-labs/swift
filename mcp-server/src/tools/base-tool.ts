import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AnalyticsCollector,
  RepositoryInfo,
  StorageResult,
} from './analytics-storage/collector/base-collector.js';
import { logInfo, logError } from '../utils/logFormatter.js';

/**
 * Base Tool Class
 *
 * This is the foundation class for all Swift tools. It provides:
 * 1. Standard tool registration with MCP server
 * 2. Integrated analytics collection and storage
 * 3. Common error handling patterns
 * 4. Logging standardization
 *
 * All tool implementations should extend this class.
 */
export abstract class BaseTool<TInput, TOutput> {
  protected toolId: string;
  protected toolVersion: string;
  protected description: string;
  protected serviceNamespace = 'swift-mcp-service';
  protected serviceVersion = '1.0.0';

  /**
   * Create a new tool
   *
   * @param toolId - Unique identifier for the tool
   * @param toolVersion - Semantic version of the tool
   * @param description - Human-readable description of the tool
   */
  constructor(toolId: string, toolVersion: string, description: string) {
    this.toolId = toolId;
    this.toolVersion = toolVersion;
    this.description = description;
  }

  /**
   * Get the schema definition for this tool
   * This must be implemented by each tool
   */
  protected abstract getSchema(): Record<string, z.ZodType<unknown>>;

  /**
   * Implement the tool's core functionality
   * This must be implemented by each tool
   *
   * @param input - Tool input parameters
   * @returns Tool output
   */
  protected abstract execute(input: TInput): Promise<TOutput>;

  /**
   * Format the response for the client
   * May be overridden by specific tools for custom formatting
   *
   * @param result - Raw execution result
   * @returns Formatted response for client
   */
  protected formatResponse(result: TOutput): Record<string, unknown> {
    // Ensure we return the correct content format expected by MCP
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
      // Include the raw results for programmatic access
      results: result,
    };
  }

  /**
   * Format error responses
   *
   * @param error - Error object
   * @returns Formatted error response for client
   */
  protected formatErrorResponse(error: Error): Record<string, unknown> {
    return {
      error: true,
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }

  /**
   * Store analytics data from tool execution
   *
   * @param repositoryInfo - Repository information
   * @param summaryData - Summary metrics
   * @param detailedData - Optional detailed data
   * @returns Analytics storage result
   */
  protected async storeAnalytics(
    repositoryInfo: RepositoryInfo,
    summaryData: Record<string, unknown>,
    detailedData?: Record<string, unknown>
  ): Promise<StorageResult> {
    try {
      const collector = new AnalyticsCollector(this.toolId, this.toolVersion, repositoryInfo);

      logInfo(`Storing analytics for ${this.toolId}`, this.serviceNamespace, this.serviceVersion, {
        context: {
          repository: repositoryInfo.name,
          path: repositoryInfo.path || 'no path specified',
        },
      });

      return await collector.store(summaryData, detailedData);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      logError(
        `Failed to store analytics for ${this.toolId}`,
        this.serviceNamespace,
        this.serviceVersion,
        err,
        {
          context: {
            repository: repositoryInfo.name,
          },
        }
      );

      // Return a minimal result to avoid breaking tool execution
      return {
        snapshotId: 'analytics-failed',
        snapshotPath: '',
        metadata: {
          tool_id: this.toolId,
          tool_version: this.toolVersion,
          schema_version: '1.0.0', // Add missing schema_version
          timestamp: new Date().toISOString(),
          repository_info: repositoryInfo,
          execution_time_ms: 0,
          error: err.message,
        },
      };
    }
  }

  /**
   * Register the tool with the MCP server
   *
   * @param server - MCP server instance
   */
  public register(server: McpServer): void {
    try {
      server.tool(
        this.toolId,
        this.description,
        this.getSchema(),
        // The key change here is to explicitly add type annotations
        // to ensure the return type matches what MCP SDK expects
        async (args: Record<string, unknown>, extra) => {
          try {
            // Execute tool functionality with properly typed input
            const result = await this.execute(args as TInput);

            // Return a properly formatted response that matches the MCP SDK expectations
            // The content array with specific objects is what the SDK requires
            return {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
              // Include the raw results for programmatic access
              results: result,
            };
          } catch (error) {
            // Handle errors
            const err = error instanceof Error ? error : new Error(String(error));

            logError(
              `Error executing tool: ${this.toolId}`,
              this.serviceNamespace,
              this.serviceVersion,
              err,
              {
                context: {
                  input: JSON.stringify(args),
                },
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${err.message}`,
                },
              ],
              isError: true,
            };
          }
        }
      );

      logInfo(
        `${this.toolId} tool registered successfully`,
        this.serviceNamespace,
        this.serviceVersion
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      logError(
        `Error registering tool: ${this.toolId}`,
        this.serviceNamespace,
        this.serviceVersion,
        err
      );

      throw err;
    }
  }
}
