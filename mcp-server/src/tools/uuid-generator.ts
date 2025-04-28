/**
 * UUID Generator tool
 * Generates one or more UUIDs with various format options
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BaseTool } from './base-tool.js';

/**
 * Input type for UUID Generator
 */
export interface UuidGeneratorInput {
  count: number;
  format: string;
  version: string;
  namespace?: string;
}

/**
 * Output type for UUID Generator
 */
export interface UuidGeneratorOutput {
  uuids: string[];
}

/**
 * UUID Generator Tool
 */
export class UuidGeneratorTool extends BaseTool<UuidGeneratorInput, UuidGeneratorOutput> {
  constructor() {
    super('uuid-generator', '1.0.0', 'Generates one or more UUIDs with various format options');
  }

  protected getSchema(): Record<string, z.ZodType<unknown>> {
    return {
      count: z.number().min(1).max(100).default(1).describe('Number of UUIDs to generate'),
      format: z
        .enum(['standard', 'no-hyphens', 'braces', 'uppercase'])
        .default('standard')
        .describe('UUID format'),
      version: z.enum(['v1', 'v4', 'v5']).default('v4').describe('UUID version'),
    };
  }

  protected async execute(input: UuidGeneratorInput): Promise<UuidGeneratorOutput> {
    // This is a placeholder implementation - in a real tool, you would use a
    // proper UUID library like uuid-js or crypto module
    const generateSingleUuid = (): string => {
      // Simple mock implementation for demonstration purposes
      // In production code, use a proper UUID library
      const chars = '0123456789abcdef';
      let uuid = '';

      // Generate a standard UUID format
      for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
          uuid += '-';
        } else if (i === 14) {
          uuid += '4'; // Version 4 UUID
        } else if (i === 19) {
          uuid += chars[(Math.random() * 4) | 8]; // Variant bits
        } else {
          uuid += chars[Math.floor(Math.random() * 16)];
        }
      }

      // Apply formatting
      switch (input.format) {
        case 'no-hyphens':
          return uuid.replace(/-/g, '');
        case 'braces':
          return `{${uuid}}`;
        case 'uppercase':
          return uuid.toUpperCase();
        default: // 'standard'
          return uuid;
      }
    };

    // Generate the requested number of UUIDs
    const uuids: string[] = [];
    for (let i = 0; i < input.count; i++) {
      uuids.push(generateSingleUuid());
    }

    // Store simple analytics
    await this.storeAnalytics(
      { name: 'uuid-generator' },
      {
        count: input.count,
        format: input.format,
        version: input.version,
      }
    );

    return { uuids };
  }

  /**
   * Register the tool with the server
   */
  public register(server: unknown): void {
    super.register(server as McpServer);
  }
}

/**
 * Create and return a UUID Generator tool instance
 */
export function createUuidGeneratorTool(): UuidGeneratorTool {
  return new UuidGeneratorTool();
}
