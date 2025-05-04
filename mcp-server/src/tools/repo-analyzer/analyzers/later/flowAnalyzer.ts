import { CodeSymbol, CallRelation } from './semanticAnalyzer.js';

/**
 * Represents a data flow connection between two symbols
 */
export interface DataFlow {
  source: string; // Source symbol name
  target: string; // Target symbol name
  type: DataFlowType; // Type of data flow
  sourceFile: string; // Source file
  targetFile: string; // Target file
}

/**
 * Type of data flow
 */
export enum DataFlowType {
  ParameterToFunction = 'parameter-to-function', // Function parameter input
  FunctionToReturn = 'function-to-return', // Function return output
  VariableToFunction = 'variable-to-function', // Variable passed to function
  FunctionToVariable = 'function-to-variable', // Function result stored in variable
  PropertyAccess = 'property-access', // Object property access
}

/**
 * Represents an execution path through the codebase
 */
export interface ExecutionPath {
  entryPoint: string; // Starting symbol
  path: string[]; // Sequence of symbols in the path
  length: number; // Number of steps in the path
  files: string[]; // Files touched by this path
}

/**
 * Component connection representing input/output relationship
 */
export interface ComponentIO {
  component: string; // Component name (usually a file or module)
  inputs: string[]; // Symbols that provide input to this component
  outputs: string[]; // Symbols this component provides as output
  dependencies: string[]; // Components this component depends on
}

/**
 * Results from flow analysis
 */
export interface FlowAnalysisResult {
  dataFlows: DataFlow[]; // Data flow connections
  executionPaths: ExecutionPath[]; // Common execution paths
  componentIO: Record<string, ComponentIO>; // Component I/O relationships
  entryPoints: string[]; // Potential program entry points
  sinks: string[]; // Terminal points in the flow (final outputs)
}

/**
 * Analyze data and control flow in the codebase
 *
 * This function tracks data flow between components, identifies input/output
 * relationships, and maps execution paths through the code.
 *
 * @param symbols - Map of all symbols
 * @param calls - Function/method call relations
 * @returns Flow analysis results
 */
export function analyzeFlows(symbols: Record<string, CodeSymbol>, calls: CallRelation[]): FlowAnalysisResult {
  // Build call graph
  const callGraph: Record<string, string[]> = {};
  for (const symbol of Object.values(symbols)) {
    callGraph[symbol.name] = [];
  }

  for (const call of calls) {
    if (callGraph[call.caller]) {
      callGraph[call.caller].push(call.callee);
    }
  }

  // Group symbols by file to identify components
  const fileToSymbols: Record<string, string[]> = {};
  for (const [name, symbol] of Object.entries(symbols)) {
    if (!fileToSymbols[symbol.filePath]) {
      fileToSymbols[symbol.filePath] = [];
    }
    fileToSymbols[symbol.filePath].push(name);
  }

  // Initialize data flows
  const dataFlows: DataFlow[] = [];

  // Create component I/O map
  const componentIO: Record<string, ComponentIO> = {};

  // For each file (component), determine inputs and outputs
  for (const [file, symbolNames] of Object.entries(fileToSymbols)) {
    const inputs: string[] = [];
    const outputs: string[] = [];
    const dependencies: string[] = [];

    for (const symbolName of symbolNames) {
      const symbol = symbols[symbolName];

      // For each caller of a symbol in this file
      const callers = calls.filter((call) => call.callee === symbolName).map((call) => call.caller);

      // For each symbol called by a symbol in this file
      const callees = calls.filter((call) => call.caller === symbolName).map((call) => call.callee);

      // If a symbol is called from outside, it's an input
      for (const caller of callers) {
        if (symbols[caller] && !symbolNames.includes(caller)) {
          inputs.push(symbolName);

          // Add data flow from caller to this symbol
          dataFlows.push({
            source: caller,
            target: symbolName,
            type: DataFlowType.ParameterToFunction,
            sourceFile: symbols[caller].filePath,
            targetFile: file,
          });

          // Add dependency on the caller's file
          const callerFile = symbols[caller].filePath;
          if (!dependencies.includes(callerFile) && callerFile !== file) {
            dependencies.push(callerFile);
          }
        }
      }

      // If a symbol calls outside, it may output data
      for (const callee of callees) {
        if (symbols[callee] && !symbolNames.includes(callee)) {
          outputs.push(symbolName);

          // Add data flow from this symbol to callee
          dataFlows.push({
            source: symbolName,
            target: callee,
            type: DataFlowType.FunctionToReturn,
            sourceFile: file,
            targetFile: symbols[callee].filePath,
          });
        }
      }
    }

    // Create component I/O record
    componentIO[file] = {
      component: file,
      inputs: [...new Set(inputs)],
      outputs: [...new Set(outputs)],
      dependencies: [...new Set(dependencies)],
    };
  }

  // Identify potential entry points (public functions/methods that aren't called internally)
  const entryPoints = Object.keys(symbols).filter((name) => {
    // Find if this symbol is never called by anything else
    const isCalled = calls.some((call) => call.callee === name);
    // Ensure it's a function that could be an entry point
    const isFunction = symbols[name].type === 'function' || symbols[name].type === 'method';
    return isFunction && !isCalled;
  });

  // Identify sink points (functions that don't call anything else)
  const sinks = Object.keys(symbols).filter((name) => {
    // Find if this symbol never calls anything else
    const callsOthers = calls.some((call) => call.caller === name);
    // Ensure it's a function
    const isFunction = symbols[name].type === 'function' || symbols[name].type === 'method';
    return isFunction && !callsOthers;
  });

  // Find common execution paths (simplified - a real analyzer would be more sophisticated)
  const executionPaths: ExecutionPath[] = [];

  // For each entry point, find paths
  for (const entry of entryPoints.slice(0, 10)) {
    // Limit to 10 entry points for performance
    // Simple DFS to find paths
    const findPaths = (current: string, path: string[] = [], visited: Set<string> = new Set()): void => {
      // Prevent cycles and limit depth
      if (visited.has(current) || path.length > 10) {
        return;
      }

      // Add current to path and mark as visited
      path.push(current);
      visited.add(current);

      // If we've reached a sink, save the path
      if (sinks.includes(current)) {
        // Collect unique files in this path
        const files = path.map((p) => symbols[p].filePath).filter((v, i, a) => a.indexOf(v) === i);

        executionPaths.push({
          entryPoint: entry,
          path: [...path],
          length: path.length,
          files,
        });
      }

      // Continue exploring
      for (const next of callGraph[current] || []) {
        findPaths(next, [...path], new Set(visited));
      }
    };

    findPaths(entry);
  }

  return {
    dataFlows,
    executionPaths,
    componentIO,
    entryPoints,
    sinks,
  };
}
