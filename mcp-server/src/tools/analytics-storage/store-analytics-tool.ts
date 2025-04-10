import { z } from 'zod';
import { BaseTool } from '../base-tool.js';
import { AnalyticsCollector } from './collector/base-collector.js';
import { logInfo, logError } from '../../utils/logFormatter.js';

/**
 * Input type for Store Analytics tool
 */
export type StoreAnalyticsInput = {
  toolId: string;
  toolVersion: string;
  repositoryInfo: {
    name: string;
    branch?: string;
    commitHash?: string;
  };
  summaryData: any;
  detailedData?: any;
};

/**
 * Output type for Store Analytics tool
 */
export type StoreAnalyticsOutput = {
  snapshotId: string;
  snapshotPath: string;
  metadata: any;
};

/**
 * Store Analytics Tool
 * 
 * A tool that stores analytics data from other tools in a standardized format.
 * Uses the BaseTool class for standardized registration and analytics.
 */
export class StoreAnalyticsTool extends BaseTool<StoreAnalyticsInput, StoreAnalyticsOutput> {
  /**
   * Create a new Store Analytics tool
   */
  constructor() {
    super(
      'store-analytics',
      '1.0.0',
      'Stores analytics data from tools in a standardized format'
    );
  }

  /**
   * Define the schema for this tool
   */
  protected getSchema(): Record<string, z.ZodType<any>> {
    return {
      toolId: z.string().describe('Unique identifier of the tool generating the analytics'),
      toolVersion: z.string().describe('Semantic version of the tool'),
      repositoryInfo: z.object({
        name: z.string().describe('Repository name'),
        branch: z.string().optional().describe('Current branch'),
        commitHash: z.string().optional().describe('Current commit hash'),
      }),
      summaryData: z.any().describe('Summary data containing key metrics for dashboard display'),
      detailedData: z.any().optional().describe('Detailed analytics data'),
    };
  }

  /**
   * Execute the analytics storage operation
   * 
   * @param input - Tool input parameters
   * @returns Storage operation result
   */
  protected async execute(input: StoreAnalyticsInput): Promise<StoreAnalyticsOutput> {
    try {
      // Create analytics collector
      const collector = new AnalyticsCollector(
        input.toolId,
        input.toolVersion,
        input.repositoryInfo
      );
      
      logInfo(`Storing analytics data for tool: ${input.toolId}`, this.serviceNamespace, this.serviceVersion, {
        context: {
          tool: this.toolId,
          action: 'store',
          toolId: input.toolId,
          repository: input.repositoryInfo.name
        }
      });
      
      // Store data using collector
      const result = await collector.store(input.summaryData, input.detailedData);
      
      logInfo(`Successfully stored analytics data: ${result.snapshotPath}`, this.serviceNamespace, this.serviceVersion, {
        context: {
          tool: this.toolId,
          action: 'store',
          toolId: input.toolId,
          snapshotId: result.snapshotId
        }
      });
      
      // Store analytics about the analytics storage itself
      await this.storeAnalytics(
        // Repository info 
        input.repositoryInfo,
        // Summary data about this operation
        {
          operation: 'store',
          source_tool: input.toolId,
          source_tool_version: input.toolVersion,
          snapshot_id: result.snapshotId,
          timestamp: new Date().toISOString()
        }
      );
      
      return result;
    } catch (error) {
      // Handle errors
      const err = error instanceof Error ? error : new Error(String(error));
      
      logError(`Failed to store analytics data for tool: ${input.toolId}`, this.serviceNamespace, this.serviceVersion, err, {
        context: {
          tool: this.toolId,
          action: 'store',
          toolId: input.toolId
        }
      });
      
      throw err;
    }
  }

  /**
   * Format the response for the client
   * 
   * @param result - Storage operation result
   * @returns Formatted response
   */
  protected formatResponse(result: StoreAnalyticsOutput): any {
    return {
      content: [
        {
          type: "text",
          text: `Analytics data stored successfully.\nSnapshot ID: ${result.snapshotId}\nPath: ${result.snapshotPath}`
        }
      ],
      results: result
    };
  }
}
