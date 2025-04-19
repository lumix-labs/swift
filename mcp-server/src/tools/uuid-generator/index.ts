import { z } from 'zod';
import { BaseTool } from '../base-tool.js';
import { logInfo } from '../../utils/logFormatter.js';

/**
 * Input type for UUID Generator
 */
export type UuidGeneratorInput = {
  version?: 'v1' | 'v4' | 'v5';
  namespace?: string;
  count?: number;
  format?: 'standard' | 'no-hyphens' | 'braces' | 'uppercase';
};

/**
 * Output type for UUID Generator
 */
export type UuidGeneratorOutput = {
  uuids: string[];
  count: number;
};

/**
 * UUID Generator Tool
 * 
 * A simple tool that generates UUIDs with various format options.
 * Uses the BaseTool class for standardized registration and analytics.
 */
export class UuidGeneratorTool extends BaseTool<UuidGeneratorInput, UuidGeneratorOutput> {
  /**
   * Create a new UUID Generator tool
   */
  constructor() {
    super(
      'uuid-generator',
      '1.0.0',
      'Generates one or more UUIDs with various format options'
    );
  }

  /**
   * Define the schema for this tool
   */
  protected getSchema(): Record<string, z.ZodType<unknown>> {
    return {
      version: z.enum(['v1', 'v4', 'v5']).optional().default('v4')
        .describe('UUID version to generate'),
      namespace: z.string().optional()
        .describe('Namespace for v5 UUIDs'),
      count: z.number().int().min(1).max(100).optional().default(1)
        .describe('Number of UUIDs to generate (1-100)'),
      format: z.enum(['standard', 'no-hyphens', 'braces', 'uppercase']).optional().default('standard')
        .describe('Output format for the generated UUID(s)')
    };
  }

  /**
   * Execute the UUID generation
   * 
   * @param input - Tool input parameters
   * @returns Generated UUIDs
   */
  protected async execute(input: UuidGeneratorInput): Promise<UuidGeneratorOutput> {
    // Extract values from input with defaults
    const version = input.version || 'v4';
    const format = input.format || 'standard';
    const requestedCount = input.count || 1;
    
    // Generate the UUIDs
    const uuids = this.generateUuids(input);
    
    logInfo(`Generated ${uuids.length} UUIDs with format: ${format}`, this.serviceNamespace, this.serviceVersion, {
      context: {
        tool: this.toolId,
        count: uuids.length,
        format,
        version
      }
    });
    
    // UUID generator doesn't operate on a specific repository,
    // so we'll skip analytics storage
    
    return { 
      uuids, 
      count: uuids.length 
    };
  }

  /**
   * Format the response for the client
   * 
   * @param result - Generated UUIDs
   * @returns Formatted response
   */
  protected formatResponse(result: UuidGeneratorOutput): Record<string, unknown> {
    return {
      uuids: result.uuids,
      count: result.count,
      content: [
        {
          type: "text",
          text: `Generated ${result.count} UUIDs:\n${result.uuids.join('\n')}`
        }
      ]
    };
  }

  /**
   * Generate UUIDs based on input parameters
   * 
   * @param input - Generator configuration
   * @returns Array of generated UUIDs
   */
  private generateUuids(input: UuidGeneratorInput): string[] {
    const version = input.version || 'v4';
    const format = input.format || 'standard';
    const requestedCount = input.count || 1;
    
    // This is a placeholder implementation - in a real tool, you would use a
    // proper UUID library like uuid-js or crypto module
    const generateSingleUuid = (): string => {
      // Simple mock implementation for demonstration purposes
      // In a real implementation, use appropriate libraries based on version
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      // Format the UUID according to the requested format
      switch (format) {
        case 'no-hyphens':
          return uuid.replace(/-/g, '');
        case 'braces':
          return `{${uuid}}`;
        case 'uppercase':
          return uuid.toUpperCase();
        default:
          return uuid;
      }
    };
    
    // Generate the requested number of UUIDs
    const uuids: string[] = [];
    for (let i = 0; i < requestedCount; i++) {
      uuids.push(generateSingleUuid());
    }
    
    return uuids;
  }
}

/**
 * Register the UUID Generator with the MCP server
 */
export function registerUuidGeneratorTool(server: unknown): void {
  const tool = new UuidGeneratorTool();
  tool.register(server);
}
