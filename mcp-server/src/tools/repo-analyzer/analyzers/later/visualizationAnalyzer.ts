import { CodeSymbol } from './semanticAnalyzer.js';
import { DataFlow } from './flowAnalyzer.js';
import { Dependency } from './dependencyAnalyzer.js';

/**
 * Graph node representation for visualization
 */
export interface GraphNode {
  id: string; // Unique identifier
  label: string; // Display label
  type: string; // Node type (file, class, function, etc.)
  group?: string; // Group for coloring/filtering
  metrics?: {
    // Node metrics
    complexity?: number; // Code complexity
    size?: number; // Node size (bytes, LOC, etc.)
    impact?: number; // Change impact score
  };
  data?: Record<string, unknown>; // Additional custom data
}

/**
 * Graph edge representation for visualization
 */
export interface GraphEdge {
  source: string; // Source node ID
  target: string; // Target node ID
  type: string; // Edge type (dependency, call, dataflow, etc.)
  weight?: number; // Edge weight/importance
  directed: boolean; // Whether the edge is directed
  data?: Record<string, unknown>; // Additional custom data
}

/**
 * Graph data structure for visualization
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Heat map data for code complexity/coupling
 */
export interface HeatMapData {
  title: string;
  files: Array<{
    path: string;
    metrics: Record<string, number>;
    intensity: number; // 0-1 normalized intensity
  }>;
  maxValues: Record<string, number>; // Maximum value for each metric
}

/**
 * Hierarchical view representation
 */
export interface HierarchyData {
  name: string;
  type: string;
  children?: HierarchyData[];
  metrics?: Record<string, number>;
}

/**
 * Visualization outputs
 */
export interface VisualizationResult {
  dependencyGraph: GraphData;
  callGraph: GraphData;
  dataFlowGraph: GraphData;
  complexityHeatMap: HeatMapData;
  couplingHeatMap: HeatMapData;
  componentHierarchy: HierarchyData;
}

/**
 * Generate visualization data structures for repository analysis
 *
 * This function creates various visualization-ready data structures including
 * different graph types, heat maps, and hierarchical views that can be rendered
 * by frontend visualization libraries.
 *
 * @param symbols - Code symbols from semantic analysis
 * @param dependencies - File dependencies
 * @param dataFlows - Data flow connections
 * @returns Visualization ready data structures
 */
export function generateVisualizations(
  symbols: Record<string, CodeSymbol>,
  dependencies: Dependency[],
  dataFlows: DataFlow[]
): VisualizationResult {
  // Generate dependency graph
  const dependencyGraph = createDependencyGraph(dependencies);

  // Generate call graph
  const callGraph = createCallGraph(symbols);

  // Generate data flow graph
  const dataFlowGraph = createDataFlowGraph(dataFlows);

  // Generate complexity heat map
  const complexityHeatMap = createComplexityHeatMap(symbols);

  // Generate coupling heat map
  const couplingHeatMap = createCouplingHeatMap(dependencies);

  // Generate component hierarchy
  const componentHierarchy = createComponentHierarchy(symbols);

  return {
    dependencyGraph,
    callGraph,
    dataFlowGraph,
    complexityHeatMap,
    couplingHeatMap,
    componentHierarchy,
  };
}

/**
 * Create a dependency graph from file dependencies
 *
 * @param dependencies - File dependencies
 * @returns Graph data
 */
function createDependencyGraph(dependencies: Dependency[]): GraphData {
  const nodes: Record<string, GraphNode> = {};
  const edges: GraphEdge[] = [];

  // Process dependencies to create nodes and edges
  for (const dep of dependencies) {
    // Skip external dependencies
    if (dep.isExternal) {
      continue;
    }

    // Create or update source node
    if (!nodes[dep.source]) {
      nodes[dep.source] = {
        id: dep.source,
        label: dep.source.split('/').pop() || dep.source,
        type: 'file',
        group: dep.source.split('/')[0] || 'root',
      };
    }

    // Create or update target node
    if (!nodes[dep.target]) {
      nodes[dep.target] = {
        id: dep.target,
        label: dep.target.split('/').pop() || dep.target,
        type: 'file',
        group: dep.target.split('/')[0] || 'root',
      };
    }

    // Create edge
    edges.push({
      source: dep.source,
      target: dep.target,
      type: dep.type,
      directed: true,
      weight: 1,
    });
  }

  return {
    nodes: Object.values(nodes),
    edges,
  };
}

/**
 * Create a call graph from symbols
 *
 * @param symbols - Code symbols
 * @returns Graph data
 */
function createCallGraph(symbols: Record<string, CodeSymbol>): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create nodes for functions and methods
  for (const [name, symbol] of Object.entries(symbols)) {
    if (symbol.type === 'function' || symbol.type === 'method') {
      nodes.push({
        id: name,
        label: name,
        type: symbol.type,
        group: symbol.filePath.split('/')[0] || 'root',
      });
    }
  }

  // Create edges for calls (simplified - a real implementation would use actual call data)
  for (const symbol of Object.values(symbols)) {
    if ((symbol.type === 'function' || symbol.type === 'method') && symbol.children.length > 0) {
      for (const child of symbol.children) {
        if (symbols[child] && (symbols[child].type === 'function' || symbols[child].type === 'method')) {
          edges.push({
            source: symbol.name,
            target: child,
            type: 'call',
            directed: true,
            weight: 1,
          });
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Create a data flow graph
 *
 * @param dataFlows - Data flow connections
 * @returns Graph data
 */
function createDataFlowGraph(dataFlows: DataFlow[]): GraphData {
  const nodes: Record<string, GraphNode> = {};
  const edges: GraphEdge[] = [];

  // Process data flows to create nodes and edges
  for (const flow of dataFlows) {
    // Create or update source node
    if (!nodes[flow.source]) {
      nodes[flow.source] = {
        id: flow.source,
        label: flow.source,
        type: 'symbol',
        group: flow.sourceFile.split('/')[0] || 'root',
      };
    }

    // Create or update target node
    if (!nodes[flow.target]) {
      nodes[flow.target] = {
        id: flow.target,
        label: flow.target,
        type: 'symbol',
        group: flow.targetFile.split('/')[0] || 'root',
      };
    }

    // Create edge
    edges.push({
      source: flow.source,
      target: flow.target,
      type: flow.type,
      directed: true,
      weight: 1,
    });
  }

  return {
    nodes: Object.values(nodes),
    edges,
  };
}

/**
 * Calculate complexity score for a symbol (simplified)
 *
 * @param symbol - Code symbol
 * @returns Complexity score
 */
function calculateComplexity(symbol: CodeSymbol): number {
  // Real implementation would use more sophisticated metrics
  // like cyclomatic complexity, nesting depth, etc.
  let complexity = 1;

  // More complex if it has many children
  complexity += symbol.children.length * 0.5;

  // More complex based on parent-child relationships
  complexity += symbol.parent ? 0.5 : 0;

  return complexity;
}

/**
 * Create a complexity heat map
 *
 * @param symbols - Code symbols
 * @returns Heat map data
 */
function createComplexityHeatMap(symbols: Record<string, CodeSymbol>): HeatMapData {
  // Group symbols by file
  const fileMetrics: Record<
    string,
    {
      complexity: number;
      symbolCount: number;
      maxSymbolComplexity: number;
    }
  > = {};

  // Calculate metrics for each symbol
  for (const symbol of Object.values(symbols)) {
    const complexity = calculateComplexity(symbol);

    if (!fileMetrics[symbol.filePath]) {
      fileMetrics[symbol.filePath] = {
        complexity: 0,
        symbolCount: 0,
        maxSymbolComplexity: 0,
      };
    }

    fileMetrics[symbol.filePath].complexity += complexity;
    fileMetrics[symbol.filePath].symbolCount++;
    fileMetrics[symbol.filePath].maxSymbolComplexity = Math.max(
      fileMetrics[symbol.filePath].maxSymbolComplexity,
      complexity
    );
  }

  // Find maximum values for normalization
  const maxValues = {
    complexity: Math.max(...Object.values(fileMetrics).map((m) => m.complexity)),
    symbolCount: Math.max(...Object.values(fileMetrics).map((m) => m.symbolCount)),
    maxSymbolComplexity: Math.max(...Object.values(fileMetrics).map((m) => m.maxSymbolComplexity)),
  };

  // Generate heat map entries
  const files = Object.entries(fileMetrics).map(([path, metrics]) => {
    // Calculate intensity (0-1) based on relative complexity
    const intensity = metrics.complexity / (maxValues.complexity || 1);

    return {
      path,
      metrics: {
        complexity: metrics.complexity,
        symbolCount: metrics.symbolCount,
        maxSymbolComplexity: metrics.maxSymbolComplexity,
      },
      intensity,
    };
  });

  return {
    title: 'Code Complexity Heat Map',
    files,
    maxValues,
  };
}

/**
 * Create a coupling heat map
 *
 * @param dependencies - File dependencies
 * @returns Heat map data
 */
function createCouplingHeatMap(dependencies: Dependency[]): HeatMapData {
  // Count inbound and outbound dependencies per file
  const fileCouplings: Record<
    string,
    {
      inbound: number;
      outbound: number;
      total: number;
    }
  > = {};

  // Count dependencies
  for (const dep of dependencies) {
    // Skip external dependencies
    if (dep.isExternal) {
      continue;
    }

    // Initialize if needed
    if (!fileCouplings[dep.source]) {
      fileCouplings[dep.source] = { inbound: 0, outbound: 0, total: 0 };
    }
    if (!fileCouplings[dep.target]) {
      fileCouplings[dep.target] = { inbound: 0, outbound: 0, total: 0 };
    }

    // Increment counts
    fileCouplings[dep.source].outbound++;
    fileCouplings[dep.source].total++;
    fileCouplings[dep.target].inbound++;
    fileCouplings[dep.target].total++;
  }

  // Find maximum values for normalization
  const maxValues = {
    inbound: Math.max(...Object.values(fileCouplings).map((c) => c.inbound)),
    outbound: Math.max(...Object.values(fileCouplings).map((c) => c.outbound)),
    total: Math.max(...Object.values(fileCouplings).map((c) => c.total)),
  };

  // Generate heat map entries
  const files = Object.entries(fileCouplings).map(([path, metrics]) => {
    // Calculate intensity (0-1) based on total coupling
    const intensity = metrics.total / (maxValues.total || 1);

    return {
      path,
      metrics: {
        inbound: metrics.inbound,
        outbound: metrics.outbound,
        total: metrics.total,
      },
      intensity,
    };
  });

  return {
    title: 'Code Coupling Heat Map',
    files,
    maxValues,
  };
}

/**
 * Type for tree node structure in component hierarchy with improved typing
 */
interface TreeNode {
  symbols?: string[];
  // Fix the index signature to make this compatible with TreeNode
  [key: string]: TreeNode | string[] | undefined;
}

/**
 * Create a hierarchical view of components
 *
 * @param symbols - Code symbols
 * @returns Hierarchy data
 */
function createComponentHierarchy(symbols: Record<string, CodeSymbol>): HierarchyData {
  // Group symbols by directory structure
  const pathTree: Record<string, TreeNode> = {};

  // Helper to ensure path exists in tree
  function ensurePath(parts: string[]): TreeNode {
    let current: Record<string, TreeNode> = pathTree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      // Type assertion needed here to help TypeScript understand the structure
      current = current as Record<string, TreeNode>;
      if (i < parts.length - 1) {
        // Safe to cast because we just initialized it as an object
        current = current[part] as Record<string, TreeNode>;
      }
    }

    // Return the last node in the path
    return current[parts[parts.length - 1]] as TreeNode;
  }

  // Process all symbols to build directory structure
  for (const symbol of Object.values(symbols)) {
    const pathParts = symbol.filePath.split('/');
    const fileName = pathParts.pop() || '';

    // Ensure path exists
    const dirNode = ensurePath(pathParts);

    // Add file node if it doesn't exist
    if (!dirNode[fileName]) {
      dirNode[fileName] = {};
    }

    // Add symbol to file
    const fileNode = dirNode[fileName] as TreeNode;
    if (!fileNode.symbols) {
      fileNode.symbols = [];
    }

    fileNode.symbols.push(symbol.name);
  }

  // Convert tree to hierarchy structure
  function convertToHierarchy(node: TreeNode, name: string): HierarchyData {
    const children: HierarchyData[] = [];
    let symbolCount = 0;

    // Process child nodes
    for (const [key, childNode] of Object.entries(node)) {
      if (key === 'symbols') {
        symbolCount = (childNode as string[]).length;
        continue;
      }

      if (childNode) {
        // Ensure childNode is not undefined
        children.push(convertToHierarchy(childNode as TreeNode, key));
      }
    }

    // Determine node type
    const isFile = 'symbols' in node;

    return {
      name,
      type: isFile ? 'file' : 'directory',
      children: children.length > 0 ? children : undefined,
      metrics: {
        symbolCount,
      },
    };
  }

  return {
    name: 'root',
    type: 'root',
    children: Object.entries(pathTree).map(([name, node]) => convertToHierarchy(node, name)),
  };
}
