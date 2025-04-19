import fs from 'fs';
import path from 'path';
import { scanDirectory } from '../../utils/fileUtils.js';
import { validateRepositoryPath } from '../../utils/pathUtils.js';

/**
 * Represents a code symbol (function, class, variable, etc.)
 */
export interface CodeSymbol {
  name: string;           // Symbol name
  type: SymbolType;       // Type of symbol (function, class, etc.)
  filePath: string;       // File containing the symbol
  location: {             // Location within the file
    line: number;         // Line number (1-based)
    column: number;       // Column number (1-based)
  };
  parent?: string;        // Parent symbol name (e.g., class for a method)
  children: string[];     // Child symbol names
  properties?: Record<string, unknown>; // Additional symbol-specific properties
}

/**
 * Type of code symbol
 */
export enum SymbolType {
  Function = 'function',
  Class = 'class',
  Interface = 'interface',
  Variable = 'variable',
  Method = 'method',
  Property = 'property',
  Enum = 'enum',
  Module = 'module',
  Unknown = 'unknown'
}

/**
 * Call relation between symbols
 */
export interface CallRelation {
  caller: string;      // Name of the calling symbol
  callee: string;      // Name of the called symbol
  filePath: string;    // File where the call occurs
  location: {
    line: number;
    column: number;
  };
}

/**
 * Inheritance relationship
 */
export interface InheritanceRelation {
  child: string;       // Derived class/interface
  parent: string;      // Base class/interface
  type: 'extends' | 'implements';
}

/**
 * Results from semantic analysis
 */
export interface SemanticAnalysisResult {
  symbols: Record<string, CodeSymbol>;  // All symbols indexed by name
  calls: CallRelation[];               // Call relationships
  inheritance: InheritanceRelation[];  // Inheritance relationships
  stats: {
    totalSymbols: number;
    symbolsByType: Record<string, number>;
    totalCalls: number;
    totalInheritance: number;
  };
}

/**
 * Simple regex patterns for symbol extraction
 * Note: These patterns are simplified and won't handle all edge cases
 * A full-featured semantic analyzer would use a proper parser
 */
const SYMBOL_PATTERNS = {
  // JavaScript/TypeScript
  js: {
    // Function declarations, arrow functions, methods
    function: [
      /function\s+(\w+)\s*\(/g,
      /const\s+(\w+)\s*=\s*(?:async\s*)?\(\s*[^)]*\)\s*=>/g,
      /(\w+)\s*:\s*(?:async\s*)?\(\s*[^)]*\)\s*=>/g,
      /(\w+)\s*\(\s*[^)]*\)\s*{/g
    ],
    // Classes
    class: [
      /class\s+(\w+)(?:\s+extends\s+(\w+(?:\.\w+)*))?/g
    ],
    // Interfaces
    interface: [
      /interface\s+(\w+)(?:\s+extends\s+(\w+(?:\.\w+)*))?/g
    ],
    // Variables (let, const, var)
    variable: [
      /(?:let|const|var)\s+(\w+)\s*=/g
    ],
    // Methods within classes
    method: [
      /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g
    ],
    // Imports
    imports: [
      /import\s+(?:{\s*([^}]*)\s*}|([^{}\s]+))\s+from\s+['"]([^'"]+)['"]/g
    ]
  }
};

/**
 * Extract code symbols from a file
 * 
 * @param filePath - Path to the file
 * @param repositoryPath - Root repository path
 * @returns Map of extracted symbols
 */
function extractSymbols(filePath: string, repositoryPath: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const relativePath = path.relative(repositoryPath, filePath);
  const fileExtension = path.extname(filePath).substring(1).toLowerCase();
  
  // Select appropriate patterns based on file extension
  let patterns: Record<string, RegExp[]> = {};
  
  if (['js', 'jsx', 'ts', 'tsx'].includes(fileExtension)) {
    patterns = SYMBOL_PATTERNS.js;
  } else {
    // No recognized pattern for this file type
    return symbols;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Removed unused variable 'lines'
    
    // Track current class to establish parent-child relationships
    let currentClass: string | null = null;
    
    // Process each pattern type
    for (const [type, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        // Reset regex lastIndex
        regex.lastIndex = 0;
        
        let match;
        while ((match = regex.exec(content)) !== null) {
          // Skip if no capture group match
          if (!match[1]) continue;
          
          const symbolName = match[1].trim();
          
          // Calculate line and column
          const upToMatch = content.substring(0, match.index);
          const line = upToMatch.split('\n').length;
          const lastNewline = upToMatch.lastIndexOf('\n');
          const column = lastNewline === -1 ? match.index + 1 : match.index - lastNewline;
          
          // Determine symbol type based on pattern and context
          let symbolType = SymbolType.Unknown;
          switch (type) {
            case 'function':
              symbolType = SymbolType.Function;
              break;
            case 'class':
              symbolType = SymbolType.Class;
              currentClass = symbolName; // Set current class for method association
              break;
            case 'interface':
              symbolType = SymbolType.Interface;
              break;
            case 'variable':
              symbolType = SymbolType.Variable;
              break;
            case 'method':
              // Only add as method if inside a class context
              if (currentClass) {
                symbolType = SymbolType.Method;
              } else {
                symbolType = SymbolType.Function;
              }
              break;
          }
          
          // Create symbol
          const symbol: CodeSymbol = {
            name: symbolName,
            type: symbolType,
            filePath: relativePath,
            location: {
              line,
              column
            },
            children: [],
            parent: type === 'method' ? currentClass ?? undefined : undefined,
          };
          
          // Check for inheritance (class extends)
          if (type === 'class' && match[2]) {
            symbol.properties = {
              extends: match[2].trim()
            };
          }
          
          symbols.push(symbol);
        }
      }
    }
    
    // Reset class context between files
    currentClass = null;
  } catch (error) {
    // Skip files that can't be read
  }
  
  return symbols;
}

/**
 * Determine caller based on location
 * Extracts the function from the inner declaration to fix the no-inner-declarations error
 *
 * @param fileSymbols - Symbols in the file
 * @param line - Line number
 * @returns Symbol name or null
 */
function getCallerAtPosition(fileSymbols: CodeSymbol[], line: number): string | null {
  for (const symbol of fileSymbols) {
    // Very basic check - in a real analyzer this would use AST traversal
    if (symbol.location.line <= line) {
      return symbol.name;
    }
  }
  return null;
}

/**
 * Extract function calls and method invocations from a file
 *
 * @param filePath - Path to the file
 * @param repositoryPath - Root repository path
 * @param symbols - Known symbols to match against
 * @returns List of call relations
 */
function extractCalls(
  filePath: string, 
  repositoryPath: string,
  symbols: Record<string, CodeSymbol>
): CallRelation[] {
  const calls: CallRelation[] = [];
  const relativePath = path.relative(repositoryPath, filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Find the symbol for this file
    const fileSymbols = Object.values(symbols).filter(s => s.filePath === relativePath);
    
    // Simple regex for function calls (this is a simplified approach)
    const callPattern = /(\w+)\s*\(/g;
    let match;
    
    const lines = content.split('\n');
    let lineNum = 1;
    
    for (const line of lines) {
      callPattern.lastIndex = 0;
      
      while ((match = callPattern.exec(line)) !== null) {
        const callee = match[1];
        
        // Skip common keywords that take parentheses but aren't function calls
        if (['if', 'for', 'while', 'switch', 'catch'].includes(callee)) {
          continue;
        }
        
        // Skip if callee isn't a known symbol
        if (!Object.values(symbols).some(s => s.name === callee)) {
          continue;
        }
        
        const caller = getCallerAtPosition(fileSymbols, lineNum);
        
        // Only add if we found both caller and callee
        if (caller && callee && caller !== callee) {
          calls.push({
            caller,
            callee,
            filePath: relativePath,
            location: {
              line: lineNum,
              column: match.index + 1
            }
          });
        }
      }
      
      lineNum++;
    }
  } catch (error) {
    // Skip files that can't be read
  }
  
  return calls;
}

/**
 * Extract inheritance relationships from symbols
 * 
 * @param symbols - Symbol map
 * @returns List of inheritance relationships
 */
function extractInheritance(symbols: Record<string, CodeSymbol>): InheritanceRelation[] {
  const relations: InheritanceRelation[] = [];
  
  for (const symbol of Object.values(symbols)) {
    if (
      (symbol.type === SymbolType.Class || symbol.type === SymbolType.Interface) && 
      symbol.properties?.extends
    ) {
      relations.push({
        child: symbol.name,
        parent: symbol.properties.extends as string,
        type: 'extends'
      });
    }
    
    // Add implements relations for interfaces (simplified)
    if (
      symbol.type === SymbolType.Class && 
      symbol.properties?.implements
    ) {
      const implementsValue = symbol.properties.implements as string;
      for (const interfaceName of implementsValue.split(',')) {
        relations.push({
          child: symbol.name,
          parent: interfaceName.trim(),
          type: 'implements'
        });
      }
    }
  }
  
  return relations;
}

/**
 * Perform semantic analysis on repository code
 * 
 * This function scans a repository for code files, extracts symbols (functions, 
 * classes, variables, etc.), analyzes call hierarchies, and identifies inheritance
 * relationships.
 * 
 * @param repositoryPath - Path to the repository root
 * @param excludePaths - Paths to exclude from analysis
 * @returns Semantic analysis results
 */
export async function analyzeSemantics(
  repositoryPath: string,
  excludePaths: string[] = ['node_modules', 'dist', '.git', 'build']
): Promise<SemanticAnalysisResult> {
  // Validate the repository path
  validateRepositoryPath(repositoryPath);
  
  // Get all files in the repository
  const filePaths = await scanDirectory(repositoryPath, excludePaths);
  
  // Extract symbols from all files
  const allSymbols: CodeSymbol[] = [];
  for (const filePath of filePaths) {
    const fileSymbols = extractSymbols(filePath, repositoryPath);
    allSymbols.push(...fileSymbols);
  }
  
  // Create symbol map
  const symbolMap: Record<string, CodeSymbol> = {};
  for (const symbol of allSymbols) {
    symbolMap[symbol.name] = symbol;
  }
  
  // Extract parent-child relationships
  for (const symbol of allSymbols) {
    if (symbol.parent && symbolMap[symbol.parent]) {
      symbolMap[symbol.parent].children.push(symbol.name);
    }
  }
  
  // Extract calls
  const calls: CallRelation[] = [];
  for (const filePath of filePaths) {
    const fileCalls = extractCalls(filePath, repositoryPath, symbolMap);
    calls.push(...fileCalls);
  }
  
  // Extract inheritance relationships
  const inheritance = extractInheritance(symbolMap);
  
  // Calculate statistics
  const symbolsByType: Record<string, number> = {};
  for (const symbol of allSymbols) {
    symbolsByType[symbol.type] = (symbolsByType[symbol.type] || 0) + 1;
  }
  
  return {
    symbols: symbolMap,
    calls,
    inheritance,
    stats: {
      totalSymbols: allSymbols.length,
      symbolsByType,
      totalCalls: calls.length,
      totalInheritance: inheritance.length
    }
  };
}