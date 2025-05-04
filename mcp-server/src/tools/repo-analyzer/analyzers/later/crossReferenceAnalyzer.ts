/**
 * Cross-Reference Analyzer
 *
 * This module analyzes code symbol usage and builds a cross-reference
 * database for identifying hot spots, unused symbols, and symbol relationships.
 */

/**
 * Interface for symbol usage data
 */
export interface SymbolUsage {
  name: string;
  type: string; // 'function', 'class', 'variable', etc.
  location: {
    file: string;
    line: number;
    column: number;
  };
  references: Array<{
    file: string;
    line: number;
    column: number;
    type: string; // 'call', 'import', 'assignment', etc.
  }>;
  referenceCount: number;
}

/**
 * Interface for symbol references
 */
export interface SymbolReference {
  source: string; // Symbol name
  target: string; // Referenced symbol name
  type: string; // 'call', 'import', 'inheritance', etc.
  location: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Find hot spots in the codebase (heavily referenced symbols)
 *
 * @param symbolUsages - Map of symbols to usage data
 * @param threshold - Minimum number of references to be a hot spot
 * @returns Array of hot spot symbols with reference counts
 */
export function findHotSpots(
  symbolUsages: Record<string, SymbolUsage>,
  threshold: number = 5
): Array<{ symbol: string; referenceCount: number }> {
  const hotspots = Object.entries(symbolUsages)
    .filter(([, usage]) => usage.referenceCount > threshold)
    .sort((a, b) => b[1].referenceCount - a[1].referenceCount)
    .map(([symbol, usage]) => ({
      symbol,
      referenceCount: usage.referenceCount,
    }));

  return hotspots;
}

/**
 * Find unused symbols in the codebase
 *
 * @param symbolUsages - Map of symbols to usage data
 * @param ignoreTypes - Symbol types to exclude from unused analysis
 * @returns Array of unused symbol names
 */
export function findUnusedSymbols(
  symbolUsages: Record<string, SymbolUsage>,
  ignoreTypes: string[] = ['export', 'interface', 'type']
): Array<string> {
  const unused = Object.entries(symbolUsages)
    .filter(([, usage]) => usage.referenceCount === 0 && !ignoreTypes.includes(usage.type))
    .map(([symbol]) => symbol);

  return unused;
}

/**
 * Build a dependency graph of symbol references
 *
 * @param symbolReferences - Array of symbol reference relationships
 * @returns Symbol dependency graph data
 */
export function buildSymbolGraph(symbolReferences: SymbolReference[]): {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ source: string; target: string; type: string }>;
} {
  const nodes = new Map<string, { id: string; label: string; type: string }>();
  const edges: Array<{ source: string; target: string; type: string }> = [];

  // Build unique nodes
  for (const ref of symbolReferences) {
    if (!nodes.has(ref.source)) {
      nodes.set(ref.source, {
        id: ref.source,
        label: ref.source,
        type: 'symbol',
      });
    }

    if (!nodes.has(ref.target)) {
      nodes.set(ref.target, {
        id: ref.target,
        label: ref.target,
        type: 'symbol',
      });
    }

    // Add edge
    edges.push({
      source: ref.source,
      target: ref.target,
      type: ref.type,
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}
