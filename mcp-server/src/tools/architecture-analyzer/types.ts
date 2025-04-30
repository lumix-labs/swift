import { z } from 'zod';

export const ArchitectureAnalyzerInputSchema = {
  repositoryPath: z.string().describe('The absolute path to the repository within the container'),
  includePatterns: z
    .array(z.string())
    .optional()
    .describe('Glob patterns for files to include (e.g., ["src/**/*.ts"])'),
  excludePatterns: z
    .array(z.string())
    .optional()
    .describe(
      'Glob patterns for files/directories to exclude (e.g., ["**/node_modules/**", "**/*.test.ts"])'
    ),
  analysisDepth: z
    .enum(['file', 'directory'])
    .default('file')
    .describe('Level of detail for dependency analysis (file or directory level)'),
  generateVisualization: z
    .boolean()
    .default(true)
    .describe('Whether to generate visualization data for the dependency graph'),
  visualizationFormat: z
    .enum(['d3', 'mermaid', 'dot'])
    .default('d3')
    .describe('Format for the visualization data (d3, mermaid, or GraphViz dot)'),
  analyzeApiSurface: z
    .boolean()
    .default(false)
    .describe('Whether to analyze public API surface exposure and encapsulation issues'),
};

export type ArchitectureAnalyzerInput = z.infer<
  z.ZodObject<typeof ArchitectureAnalyzerInputSchema>
>;

export interface DependencyInfo {
  source: string;
  target: string;
}

export interface ModuleCoupling {
  module: string;
  afferentCoupling: number; // Incoming dependencies
  efferentCoupling: number; // Outgoing dependencies
  instability: number; // Efferent / (Afferent + Efferent)
}

export interface CircularDependency {
  path: string[];
}

export interface DependencyNode {
  id: string;
  label: string;
  type: 'file' | 'directory' | 'package' | 'external';
  metrics?: {
    afferentCoupling: number;
    efferentCoupling: number;
    instability: number;
  };
  size?: number; // For visualization purposes (e.g., based on coupling)
  group?: string; // For grouping related nodes (e.g., by directory or package)
}

export interface DependencyLink {
  source: string;
  target: string;
  isCircular?: boolean; // Whether this link is part of a circular dependency
  weight?: number; // For visualization purposes (e.g., frequency of dependency)
}

export interface VisualizationData {
  format: 'd3' | 'mermaid' | 'dot';
  nodes: DependencyNode[];
  links: DependencyLink[];
  // For mermaid or dot format, the raw string representation
  rawGraph?: string;
}

export interface ApiMember {
  name: string;
  kind:
    | 'class'
    | 'interface'
    | 'function'
    | 'variable'
    | 'constant'
    | 'type'
    | 'enum'
    | 'namespace';
  isExported: boolean;
  isPublic: boolean; // For classes/interfaces: is the member public
  isDefault: boolean; // Is it a default export
  exposedBy: string; // The file that exposes this API
  location: {
    line: number;
    column: number;
  };
  description?: string; // From JSDoc/TSDoc if available
}

export interface ApiSurfaceResult {
  moduleCount: number;
  exportedMembers: ApiMember[];
  publicApiSurface: ApiMember[]; // Members exposed through entry points or public APIs
  internalApiSurface: ApiMember[]; // Members exported but not part of public API
  encapsulationIssues: {
    type: 'public-implementation-detail' | 'unstable-api' | 'excessive-exposure';
    member: ApiMember;
    reason: string;
  }[];
}

export interface ArchitectureAnalysisResult {
  moduleCount: number;
  dependencyCount: number;
  circularDependencies: CircularDependency[];
  couplingMetrics: ModuleCoupling[];
  visualization?: VisualizationData;
  apiSurface?: ApiSurfaceResult; // New API surface analysis results
  // Add other relevant metrics as needed
}

export type ArchitectureAnalyzerOutput = ArchitectureAnalysisResult;

// Analytics data structure
export interface ArchitectureAnalyzerSummary {
  moduleCount: number;
  dependencyCount: number;
  circularDependencyCount: number;
  averageInstability: number;
  maxAfferentCoupling: number;
  maxEfferentCoupling: number;
}
