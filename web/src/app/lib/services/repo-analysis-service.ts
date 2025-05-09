"use client";

export interface DependencyGraphNode {
  id: string;
  name: string;
  type: string;
  incomingDependencies: string[];
  outgoingDependencies: string[];
}

export interface DependencyGraph {
  nodes: Record<string, DependencyGraphNode>;
}

export interface ApiSurface {
  endpoints: ApiEndpoint[];
  libraries: ApiLibrary[];
}

export interface ApiEndpoint {
  path: string;
  method: string;
  description?: string;
  parameters?: ApiParameter[];
  requestBody?: any;
  responses?: Record<string, any>;
}

export interface ApiLibrary {
  name: string;
  exports: ApiExport[];
}

export interface ApiExport {
  name: string;
  type: 'class' | 'function' | 'constant' | 'interface' | 'other';
  description?: string;
  signature?: string;
}

export interface ApiParameter {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
}

/**
 * Generate dependency graph from the repository files
 */
export const generateDependencyGraph = (files: { [path: string]: Uint8Array }): DependencyGraph => {
  const graph: DependencyGraph = { nodes: {} };
  const textDecoder = new TextDecoder("utf-8");
  
  // Map to store the actual module names by path
  const moduleNames: Record<string, string> = {};
  
  // First pass - create nodes and identify modules
  Object.keys(files).forEach(filePath => {
    // Skip test files and non-code files
    if (
      filePath.includes('node_modules/') || 
      filePath.includes('test/') || 
      filePath.includes('__tests__/') ||
      !isCodeFile(filePath)
    ) {
      return;
    }
    
    try {
      const content = textDecoder.decode(files[filePath]);
      const moduleName = extractModuleName(filePath);
      moduleNames[filePath] = moduleName;
      
      graph.nodes[filePath] = {
        id: filePath,
        name: moduleName,
        type: getFileType(filePath),
        incomingDependencies: [],
        outgoingDependencies: []
      };
    } catch (error) {
      console.error(`Error processing ${filePath} for dependency graph:`, error);
    }
  });
  
  // Second pass - analyze imports and build connections
  Object.keys(files).forEach(filePath => {
    if (!graph.nodes[filePath]) return;
    
    try {
      const content = textDecoder.decode(files[filePath]);
      const importedModules = extractImports(content, filePath);
      
      // Map imported modules to actual file paths
      importedModules.forEach(importedModule => {
        // Attempt to resolve the import to an actual file path
        const resolvedPath = resolveImportPath(importedModule, filePath, Object.keys(files));
        
        if (resolvedPath && graph.nodes[resolvedPath]) {
          // Add to outgoing dependencies
          if (!graph.nodes[filePath].outgoingDependencies.includes(resolvedPath)) {
            graph.nodes[filePath].outgoingDependencies.push(resolvedPath);
          }
          
          // Add to incoming dependencies
          if (!graph.nodes[resolvedPath].incomingDependencies.includes(filePath)) {
            graph.nodes[resolvedPath].incomingDependencies.push(filePath);
          }
        }
      });
    } catch (error) {
      console.error(`Error analyzing imports for ${filePath}:`, error);
    }
  });
  
  return graph;
};

/**
 * Extract module name from file path
 */
const extractModuleName = (filePath: string): string => {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.split('.')[0];
};

/**
 * Determine file type based on extension
 */
const getFileType = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  switch(ext) {
    case 'ts':
    case 'tsx':
      return 'TypeScript';
    case 'js':
    case 'jsx':
      return 'JavaScript';
    case 'py':
      return 'Python';
    case 'java':
      return 'Java';
    case 'rb':
      return 'Ruby';
    case 'go':
      return 'Go';
    case 'php':
      return 'PHP';
    case 'cs':
      return 'C#';
    default:
      return ext || 'Unknown';
  }
};

/**
 * Check if a file is a code file
 */
const isCodeFile = (filePath: string): boolean => {
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'rb', 'go', 'php', 'cs', 
    'c', 'cpp', 'h', 'swift', 'rs', 'scala', 'kt'
  ];
  
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext !== undefined && codeExtensions.includes(ext);
};

/**
 * Extract import statements from file content
 */
const extractImports = (content: string, filePath: string): string[] => {
  const imports: string[] = [];
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') {
    // ES6 import
    const es6ImportRegex = /import(?:["'\s]*([\w*{}\n\r\t, ]+)from\s*)?["'\s]["'\s](.*?)["'\s]/g;
    let match;
    while ((match = es6ImportRegex.exec(content)) !== null) {
      if (match[2] && !match[2].startsWith('@') && !match[2].startsWith('.')) continue; // Skip external packages
      imports.push(match[2]);
    }
    
    // CommonJS require
    const requireRegex = /(?:const|let|var)\s+(?:[\w{},\s]+)\s+=\s+require\(['"](.+?)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      if (match[1] && !match[1].startsWith('@') && !match[1].startsWith('.')) continue; // Skip external packages
      imports.push(match[1]);
    }
  } else if (ext === 'py') {
    // Python imports
    const importRegex = /(?:from\s+(\S+)\s+import)|(?:import\s+(\S+))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const moduleName = match[1] || match[2];
      if (moduleName && !imports.includes(moduleName)) {
        imports.push(moduleName);
      }
    }
  }
  
  return imports;
};

/**
 * Resolve import path to actual file path
 */
const resolveImportPath = (importPath: string, currentFilePath: string, allPaths: string[]): string | null => {
  // Handle relative imports
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
    let targetPath = normalizePath(`${currentDir}/${importPath}`);
    
    // Try to find the exact file
    if (allPaths.includes(targetPath)) {
      return targetPath;
    }
    
    // Try common extensions
    const exts = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    for (const ext of exts) {
      if (allPaths.includes(`${targetPath}${ext}`)) {
        return `${targetPath}${ext}`;
      }
    }
    
    // Try index files
    for (const ext of exts) {
      if (allPaths.includes(`${targetPath}/index${ext}`)) {
        return `${targetPath}/index${ext}`;
      }
    }
  } else if (importPath.startsWith('@')) {
    // Handle aliased imports (common in monorepos)
    // This is a simplified approach; real resolution would depend on tsconfig/webpack config
    const pathParts = importPath.split('/');
    const aliasName = pathParts[0] + '/' + pathParts[1]; // e.g., '@org/module'
    
    // Find files that might match this alias
    const matches = allPaths.filter(path => {
      const isMatch = path.includes(pathParts.slice(1).join('/'));
      const isCode = isCodeFile(path);
      return isMatch && isCode;
    });
    
    if (matches.length > 0) {
      return matches[0]; // Return the first match
    }
  }
  
  return null;
};

/**
 * Normalize a path by resolving .. and .
 */
const normalizePath = (path: string): string => {
  const parts = path.split('/');
  const result = [];
  
  for (const part of parts) {
    if (part === '..') {
      result.pop();
    } else if (part !== '.' && part !== '') {
      result.push(part);
    }
  }
  
  return result.join('/');
};

/**
 * Analyze API surface of the repository
 */
export const analyzeApiSurface = (files: { [path: string]: Uint8Array }): ApiSurface => {
  const apiSurface: ApiSurface = {
    endpoints: [],
    libraries: []
  };
  
  const textDecoder = new TextDecoder("utf-8");
  
  // First, find API endpoint files (routes, controllers, etc.)
  Object.keys(files).forEach(filePath => {
    // Skip non-code files and node_modules
    if (!isCodeFile(filePath) || filePath.includes('node_modules/')) {
      return;
    }
    
    try {
      const content = textDecoder.decode(files[filePath]);
      
      // Detect API endpoints
      const endpoints = extractApiEndpoints(content, filePath);
      if (endpoints.length > 0) {
        apiSurface.endpoints.push(...endpoints);
      }
      
      // Detect exported libraries and functions
      const library = extractApiLibrary(content, filePath);
      if (library && library.exports.length > 0) {
        apiSurface.libraries.push(library);
      }
    } catch (error) {
      console.error(`Error analyzing API surface for ${filePath}:`, error);
    }
  });
  
  return apiSurface;
};

/**
 * Extract API endpoints from file content
 */
const extractApiEndpoints = (content: string, filePath: string): ApiEndpoint[] => {
  const endpoints: ApiEndpoint[] = [];
  
  // Check if file is an API endpoint file (Node/Express, Next.js API routes, etc.)
  const isApiFile = isApiEndpointFile(filePath);
  if (!isApiFile) return endpoints;
  
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  if (ext === 'ts' || ext === 'js' || ext === 'tsx' || ext === 'jsx') {
    // Express-style route definitions
    const expressRouteRegex = /(?:app|router)\.(?:get|post|put|delete|patch)\s*\(\s*['"](.*?)['"](?:[\s\S]*?)\)/g;
    let match;
    
    while ((match = expressRouteRegex.exec(content)) !== null) {
      const routePath = match[1];
      const routeDefinition = match[0];
      const method = routeDefinition.toLowerCase().includes('.get(') ? 'GET' : 
                    routeDefinition.toLowerCase().includes('.post(') ? 'POST' :
                    routeDefinition.toLowerCase().includes('.put(') ? 'PUT' :
                    routeDefinition.toLowerCase().includes('.delete(') ? 'DELETE' : 'PATCH';
      
      endpoints.push({
        path: routePath,
        method: method
      });
    }
    
    // Next.js API routes
    if (filePath.includes('/api/') || filePath.includes('/app/api/')) {
      // Extract HTTP methods from exports or handler functions
      const methodRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
      const methods: string[] = [];
      
      while ((match = methodRegex.exec(content)) !== null) {
        const fnName = match[1].toLowerCase();
        if (['get', 'post', 'put', 'delete', 'patch'].includes(fnName)) {
          methods.push(fnName.toUpperCase());
        }
      }
      
      // If no specific methods found, look for generic handlers
      if (methods.length === 0 && (content.includes('export default') || content.includes('export async function handler'))) {
        // Path-based inference
        const pathParts = filePath.split('/');
        let routePath = '';
        
        // Extract route path from file structure
        const apiIndex = pathParts.findIndex(part => part === 'api');
        if (apiIndex >= 0) {
          routePath = '/' + pathParts.slice(apiIndex).join('/').replace(/\.(js|ts|jsx|tsx)$/, '');
          
          // Handle dynamic routes
          routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');
        }
        
        endpoints.push({
          path: routePath,
          method: 'ANY' // Default to ANY if can't determine specific method
        });
      } else {
        // Path-based inference for specific methods
        const pathParts = filePath.split('/');
        let routePath = '';
        
        const apiIndex = pathParts.findIndex(part => part === 'api');
        if (apiIndex >= 0) {
          routePath = '/' + pathParts.slice(apiIndex).join('/').replace(/\.(js|ts|jsx|tsx)$/, '');
          routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');
        }
        
        methods.forEach(method => {
          endpoints.push({
            path: routePath,
            method: method
          });
        });
      }
    }
  } else if (ext === 'py') {
    // Flask routes
    const flaskRouteRegex = /@(?:app|blueprint)\.route\(['"](.*?)['"](?:,\s*methods=\[(.*?)\])?\)/g;
    let match;
    
    while ((match = flaskRouteRegex.exec(content)) !== null) {
      const routePath = match[1];
      const methods = match[2] ? match[2].replace(/['"]/g, '').split(',').map(m => m.trim()) : ['GET'];
      
      methods.forEach(method => {
        endpoints.push({
          path: routePath,
          method: method
        });
      });
    }
    
    // FastAPI routes
    const fastApiRouteRegex = /@(?:app|router)\.(?:get|post|put|delete|patch)\(['"](.*?)['"](?:[\s\S]*?)\)/g;
    
    while ((match = fastApiRouteRegex.exec(content)) !== null) {
      const routePath = match[1];
      const routeDefinition = match[0];
      const method = routeDefinition.toLowerCase().includes('.get(') ? 'GET' : 
                    routeDefinition.toLowerCase().includes('.post(') ? 'POST' :
                    routeDefinition.toLowerCase().includes('.put(') ? 'PUT' :
                    routeDefinition.toLowerCase().includes('.delete(') ? 'DELETE' : 'PATCH';
      
      endpoints.push({
        path: routePath,
        method: method
      });
    }
  }
  
  return endpoints;
};

/**
 * Check if a file is likely an API endpoint file
 */
const isApiEndpointFile = (filePath: string): boolean => {
  const patterns = [
    '/api/',
    '/routes/',
    '/controllers/',
    '/endpoints/',
    'Controller',
    'ApiHandler'
  ];
  
  return patterns.some(pattern => filePath.includes(pattern));
};

/**
 * Extract API library information from file content
 */
const extractApiLibrary = (content: string, filePath: string): ApiLibrary | null => {
  const fileName = filePath.split('/').pop() || '';
  const moduleName = fileName.split('.')[0];
  
  const exports: ApiExport[] = [];
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  if (ext === 'ts' || ext === 'js' || ext === 'tsx' || ext === 'jsx') {
    // ES6 exports
    const exportRegex = /export\s+(?:default\s+)?(?:(const|let|var|function|class|interface|type|enum)\s+)?(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      const exportType = match[1] || 'other';
      const exportName = match[2];
      
      let type: ApiExport['type'] = 'other';
      if (exportType === 'class') type = 'class';
      else if (exportType === 'function') type = 'function';
      else if (exportType === 'const' || exportType === 'let' || exportType === 'var') type = 'constant';
      else if (exportType === 'interface') type = 'interface';
      
      exports.push({
        name: exportName,
        type: type
      });
    }
    
    // CommonJS exports
    const commonJsExportRegex = /(?:module\.exports|exports)\.(\w+)\s*=/g;
    while ((match = commonJsExportRegex.exec(content)) !== null) {
      const exportName = match[1];
      exports.push({
        name: exportName,
        type: 'other'
      });
    }
    
    // Default CommonJS export
    if (content.includes('module.exports = ')) {
      // Try to determine what's being exported
      if (content.includes('class ')) {
        const classNameMatch = content.match(/class\s+(\w+)/);
        if (classNameMatch) {
          exports.push({
            name: classNameMatch[1],
            type: 'class'
          });
        } else {
          exports.push({
            name: moduleName,
            type: 'class'
          });
        }
      } else if (content.includes('function ')) {
        const functionNameMatch = content.match(/function\s+(\w+)/);
        if (functionNameMatch) {
          exports.push({
            name: functionNameMatch[1],
            type: 'function'
          });
        } else {
          exports.push({
            name: moduleName,
            type: 'function'
          });
        }
      }
    }
  } else if (ext === 'py') {
    // Get all class and function definitions that don't start with _ (convention for private)
    const classRegex = /class\s+(\w+)(?:\(|:)/g;
    const functionRegex = /def\s+(\w+)(?:\(|:)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      if (!className.startsWith('_')) {
        exports.push({
          name: className,
          type: 'class'
        });
      }
    }
    
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      if (!functionName.startsWith('_')) {
        exports.push({
          name: functionName,
          type: 'function'
        });
      }
    }
  }
  
  if (exports.length > 0) {
    return {
      name: moduleName,
      exports: exports
    };
  }
  
  return null;
};
