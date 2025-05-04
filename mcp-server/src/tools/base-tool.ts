import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import {
  AnalyticsCollector,
  RepositoryInfo,
  StorageResult,
  CollectorMetadata,
} from './analytics-storage/collector/base-collector.js';
import { logInfo, logError } from '../utils/logFormatter.js';

// Define the supported content types based on the SDK requirements
type TextContent = {
  type: 'text';
  text: string;
  [key: string]: unknown;
};

type ImageContent = {
  type: 'image';
  data: string;
  mimeType: string;
  [key: string]: unknown;
};

type ResourceContent = {
  type: 'resource';
  resource:
    | {
        text: string;
        uri: string;
        mimeType?: string;
        [key: string]: unknown;
      }
    | {
        uri: string;
        blob: string;
        mimeType?: string;
        [key: string]: unknown;
      };
  [key: string]: unknown;
};

// Union type of all supported content types
type ContentItem = TextContent | ImageContent | ResourceContent;

// Tool response type that matches MCP SDK requirements
export type ToolResponse = {
  content: ContentItem[];
  _meta?: Record<string, unknown>;
  isError?: boolean;
  [key: string]: unknown;
};

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
  protected formatResponse(result: TOutput): ToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
      results: result,
    };
  }

  /**
   * Format error responses
   *
   * @param error - Error object
   * @returns Formatted error response for client
   */
  protected formatErrorResponse(error: Error): ToolResponse {
    return {
      isError: true,
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

      logError(`Failed to store analytics for ${this.toolId}`, this.serviceNamespace, this.serviceVersion, err, {
        context: {
          repository: repositoryInfo.name,
        },
      });

      // Create a metadata object without the 'error' property
      const metadata: CollectorMetadata = {
        tool_id: this.toolId,
        tool_version: this.toolVersion,
        schema_version: '1.0.0',
        timestamp: new Date().toISOString(),
        repository_info: repositoryInfo,
        execution_time_ms: 0,
      };

      // Return a minimal result to avoid breaking tool execution
      return {
        snapshotId: 'analytics-failed',
        snapshotPath: '',
        metadata,
        // Add error info to the result object but not to the metadata
        // This way we can access the error, but it doesn't break the type
        error: err.message,
      } as StorageResult;
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
        async (args: Record<string, unknown>, extra: RequestHandlerExtra) => {
          try {
            // Execute tool functionality with properly typed input
            const result = await this.execute(args as TInput);

            // Return formatted response
            return this.formatResponse(result);
          } catch (error) {
            // Handle errors
            const err = error instanceof Error ? error : new Error(String(error));

            logError(`Error executing tool: ${this.toolId}`, this.serviceNamespace, this.serviceVersion, err, {
              context: {
                input: JSON.stringify(args),
              },
            });

            return this.formatErrorResponse(err);
          }
        }
      );

      logInfo(`${this.toolId} tool registered successfully`, this.serviceNamespace, this.serviceVersion);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      logError(`Error registering tool: ${this.toolId}`, this.serviceNamespace, this.serviceVersion, err);

      throw err;
    }
  }
}
