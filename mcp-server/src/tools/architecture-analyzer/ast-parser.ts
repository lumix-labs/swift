/**
 * AST-based parsing for more accurate dependency extraction
 *
 * This module provides functionality to parse JavaScript and TypeScript files
 * using Abstract Syntax Tree (AST) parsing instead of regex-based approaches,
 * resulting in more accurate dependency detection.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as babel from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse = traverseModule.default;
import * as typescript from 'typescript';
import { logInfo, logError, logWarning } from '../../utils/index.js';
import * as fsSync from 'fs';

const TOOL_ID = 'architecture-analyzer';
const TOOL_VERSION = '0.1.0';

/**
 * Extract dependencies from a file using AST parsing
 * @param filePath Path to the file to parse
 * @param repositoryPath Base repository path
 * @returns Array of dependencies
 */
export async function extractDependenciesAST(
  filePath: string,
  repositoryPath: string
): Promise<string[]> {
  try {
    const fileExt = path.extname(filePath).toLowerCase();
    const content = await fs.readFile(filePath, 'utf-8');
    const dependencies = new Set<string>();

    // Handle JavaScript/TypeScript files
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(fileExt)) {
      // Parse the file with Babel
      const isTypeScript = ['.ts', '.tsx'].includes(fileExt);
      const plugins = [
        'jsx',
        ...(isTypeScript ? ['typescript'] : []),
        'decorators-legacy',
        'class-properties',
        'optional-chaining',
        'nullish-coalescing-operator',
      ] as babel.ParserPlugin[];

      const ast = babel.parse(content, {
        sourceType: 'module',
        plugins,
        errorRecovery: true,
      });

      // Use Babel traverse to find import/require statements
      traverse(ast, {
        // ES6 imports
        ImportDeclaration(path: any) {
          const source = path.node.source.value;
          if (typeof source === 'string') {
            dependencies.add(source);
          }
        },
        // Dynamic imports
        CallExpression(path: any) {
          if (
            path.node.callee.type === 'Import' ||
            (path.node.callee.type === 'Identifier' && path.node.callee.name === 'require')
          ) {
            const arg = path.node.arguments[0];
            if (arg && arg.type === 'StringLiteral') {
              dependencies.add(arg.value);
            }
          }
        },
        // Export from statements
        ExportAllDeclaration(path: any) {
          const source = path.node.source?.value;
          if (typeof source === 'string') {
            dependencies.add(source);
          }
        },
        ExportNamedDeclaration(path: any) {
          const source = path.node.source?.value;
          if (typeof source === 'string') {
            dependencies.add(source);
          }
        },
      });
    }

    return Array.from(dependencies);
  } catch (error: any) {
    logError(`AST parsing failed for ${filePath}: ${error.message}`, TOOL_ID, TOOL_VERSION, error);
    // Fall back to empty dependencies on error
    return [];
  }
}

/**
 * Supported programming languages for module resolution
 */
export enum LanguageType {
  JavaScript = 'javascript',
  TypeScript = 'typescript',
  Python = 'python',
  Java = 'java',
  Go = 'go',
  Ruby = 'ruby',
  Other = 'other',
}

/**
 * Determines the language type based on file extension
 * @param filePath Path to the source file
 * @returns The language type
 */
function getLanguageType(filePath: string): LanguageType {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return LanguageType.JavaScript;
    case '.ts':
    case '.tsx':
      return LanguageType.TypeScript;
    case '.py':
      return LanguageType.Python;
    case '.java':
      return LanguageType.Java;
    case '.go':
      return LanguageType.Go;
    case '.rb':
      return LanguageType.Ruby;
    default:
      return LanguageType.Other;
  }
}

/**
 * Interface for module resolution options
 */
interface ResolutionOptions {
  sourceFile: string;
  dependency: string;
  repositoryPath: string;
  tsConfig?: typescript.ParsedCommandLine;
  pythonPath?: string[];
}

/**
 * Main module resolution function that dispatches to language-specific resolvers
 * @param options Resolution options
 * @returns Resolved path or null if can't be resolved
 */
export async function resolveModule(options: ResolutionOptions): Promise<string | null> {
  const { sourceFile, dependency, repositoryPath } = options;
  const languageType = getLanguageType(sourceFile);

  try {
    // Handle node_modules packages and built-ins (non-relative imports)
    if (
      !dependency.startsWith('.') &&
      !dependency.startsWith('/') &&
      languageType !== LanguageType.Python
    ) {
      return dependency;
    }

    switch (languageType) {
      case LanguageType.JavaScript:
        return await resolveNodeJsModule(options);
      case LanguageType.TypeScript:
        return await resolveTypeScriptModule(options);
      case LanguageType.Python:
        return await resolvePythonModule(options);
      case LanguageType.Java:
        return await resolveJavaModule(options);
      case LanguageType.Go:
        return await resolveGoModule(options);
      case LanguageType.Ruby:
        return await resolveRubyModule(options);
      default:
        // Fallback to basic resolution
        return await resolveBasicModule(options);
    }
  } catch (error: any) {
    logError(
      `Error resolving module ${dependency} from ${sourceFile}: ${error.message}`,
      TOOL_ID,
      TOOL_VERSION,
      error
    );
    return null;
  }
}

/**
 * Enhanced Node.js module resolution algorithm
 * Implements full Node.js resolution including package.json fields
 */
async function resolveNodeJsModule(options: ResolutionOptions): Promise<string | null> {
  const { sourceFile, dependency, repositoryPath } = options;

  // Non-relative imports (node_modules)
  if (!dependency.startsWith('.') && !dependency.startsWith('/')) {
    // Try to find in node_modules using node resolution algorithm
    return await resolveNodeModulePath(sourceFile, dependency, repositoryPath);
  }

  // Handle relative imports
  const sourceDir = path.dirname(sourceFile);
  let resolvedPath = path.resolve(sourceDir, dependency);

  // File exists as is
  try {
    const stats = await fs.stat(resolvedPath);
    if (stats.isFile()) {
      return path.relative(repositoryPath, resolvedPath);
    }
  } catch (e) {
    // Continue resolution
  }

  // Try with extensions (in Node.js priority order)
  const extensions = ['.js', '.json', '.node', '.jsx', '.mjs', '.cjs'];
  for (const ext of extensions) {
    try {
      const pathWithExt = resolvedPath + ext;
      const stats = await fs.stat(pathWithExt);
      if (stats.isFile()) {
        return path.relative(repositoryPath, pathWithExt);
      }
    } catch (e) {
      // Continue to next extension
    }
  }

  // Check for directory with package.json
  try {
    const packageJsonPath = path.join(resolvedPath, 'package.json');
    if (fsSync.existsSync(packageJsonPath)) {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Check exports field first (Node.js v12+)
      if (packageJson.exports) {
        // Handle exports object with conditional exports
        if (typeof packageJson.exports === 'object' && !Array.isArray(packageJson.exports)) {
          // Check for main export
          if (packageJson.exports['.']) {
            const mainExport =
              typeof packageJson.exports['.'] === 'string'
                ? packageJson.exports['.']
                : packageJson.exports['.'].default || packageJson.exports['.'].require;

            if (mainExport) {
              const mainPath = path.join(resolvedPath, mainExport);
              if (fsSync.existsSync(mainPath)) {
                return path.relative(repositoryPath, mainPath);
              }
            }
          }
        }
        // Handle exports as string
        else if (typeof packageJson.exports === 'string') {
          const mainPath = path.join(resolvedPath, packageJson.exports);
          if (fsSync.existsSync(mainPath)) {
            return path.relative(repositoryPath, mainPath);
          }
        }
      }

      // Check module field for ESM (Node.js v12+)
      if (packageJson.module) {
        const modulePath = path.join(resolvedPath, packageJson.module);
        if (fsSync.existsSync(modulePath)) {
          return path.relative(repositoryPath, modulePath);
        }
      }

      // Check main field (traditional Node.js)
      if (packageJson.main) {
        const mainPath = path.join(resolvedPath, packageJson.main);
        // Try the main field directly
        if (fsSync.existsSync(mainPath)) {
          return path.relative(repositoryPath, mainPath);
        }

        // Try main field with extensions
        for (const ext of extensions) {
          const mainWithExt = mainPath + ext;
          if (fsSync.existsSync(mainWithExt)) {
            return path.relative(repositoryPath, mainWithExt);
          }
        }
      }
    }
  } catch (e) {
    // Continue with resolution
  }

  // Check for index files in directory
  const indexFiles = [
    'index.js',
    'index.json',
    'index.node',
    'index.jsx',
    'index.mjs',
    'index.cjs',
  ];
  for (const indexFile of indexFiles) {
    const indexPath = path.join(resolvedPath, indexFile);
    if (fsSync.existsSync(indexPath)) {
      return path.relative(repositoryPath, indexPath);
    }
  }

  // Not found
  logWarning(
    `Couldn't resolve Node.js module: ${dependency} from ${sourceFile}`,
    TOOL_ID,
    TOOL_VERSION
  );
  return dependency;
}

/**
 * Resolves node_modules imports by walking up the directory tree
 */
async function resolveNodeModulePath(
  sourceFile: string,
  dependency: string,
  repositoryPath: string
): Promise<string | null> {
  let current = path.dirname(sourceFile);
  const parts = dependency.split('/');
  const packageName = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];

  // Walk up the directory tree looking for node_modules
  while (current !== path.parse(current).root) {
    const nodeModulesPath = path.join(current, 'node_modules');
    const packagePath = path.join(nodeModulesPath, packageName);

    if (fsSync.existsSync(packagePath)) {
      if (parts.length === 1 || (parts[0].startsWith('@') && parts.length === 2)) {
        // Resolve main file of the package
        const packageJsonPath = path.join(packagePath, 'package.json');
        if (fsSync.existsSync(packageJsonPath)) {
          try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);

            // Use the same resolution logic as in resolveNodeJsModule
            if (packageJson.main) {
              const mainPath = path.join(packagePath, packageJson.main);
              if (fsSync.existsSync(mainPath)) {
                return mainPath;
              }

              // Try with extensions
              const extensions = ['.js', '.json', '.node', '.jsx', '.mjs', '.cjs'];
              for (const ext of extensions) {
                const mainWithExt = mainPath + ext;
                if (fsSync.existsSync(mainWithExt)) {
                  return mainWithExt;
                }
              }
            }

            // Check for index.js
            const indexPath = path.join(packagePath, 'index.js');
            if (fsSync.existsSync(indexPath)) {
              return indexPath;
            }
          } catch (e) {
            // Continue resolution
          }
        }
      } else {
        // Resolve subpath within the package
        const subPath = parts.slice(parts[0].startsWith('@') ? 2 : 1).join('/');
        const fullPath = path.join(packagePath, subPath);

        if (fsSync.existsSync(fullPath)) {
          if (fsSync.statSync(fullPath).isFile()) {
            return fullPath;
          }
        }

        // Try with extensions
        const extensions = ['.js', '.json', '.node', '.jsx', '.mjs', '.cjs'];
        for (const ext of extensions) {
          const fullPathWithExt = fullPath + ext;
          if (fsSync.existsSync(fullPathWithExt)) {
            return fullPathWithExt;
          }
        }

        // Check for index.js if it's a directory
        if (fsSync.existsSync(fullPath) && fsSync.statSync(fullPath).isDirectory()) {
          const indexPath = path.join(fullPath, 'index.js');
          if (fsSync.existsSync(indexPath)) {
            return indexPath;
          }
        }
      }
    }

    // Move up one directory
    current = path.dirname(current);
  }

  // Not found in node_modules, return the original dependency name
  return dependency;
}

/**
 * Enhanced TypeScript module resolution algorithm
 * Implements TypeScript module resolution including path mapping
 */
async function resolveTypeScriptModule(options: ResolutionOptions): Promise<string | null> {
  const { sourceFile, dependency, repositoryPath } = options;

  // Find and parse tsconfig.json if not provided
  let tsConfig = options.tsConfig;
  if (!tsConfig) {
    tsConfig = findAndParseTsConfig(sourceFile, repositoryPath);
  }

  // Use TypeScript's module resolution if we found a tsconfig
  if (tsConfig) {
    // Handle path mappings from tsconfig.json
    if (tsConfig.options.paths) {
      const possiblePaths = applyTsPathMappings(dependency, tsConfig, repositoryPath);

      // Try each possible path from path mappings
      for (const possiblePath of possiblePaths) {
        if (fsSync.existsSync(possiblePath)) {
          if (fsSync.statSync(possiblePath).isFile()) {
            return path.relative(repositoryPath, possiblePath);
          }

          // Check for possible index files
          const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
          for (const indexFile of indexFiles) {
            const indexPath = path.join(possiblePath, indexFile);
            if (fsSync.existsSync(indexPath)) {
              return path.relative(repositoryPath, indexPath);
            }
          }
        }

        // Try with extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        for (const ext of extensions) {
          const pathWithExt = possiblePath + ext;
          if (fsSync.existsSync(pathWithExt)) {
            return path.relative(repositoryPath, pathWithExt);
          }
        }
      }
    }

    // Use baseUrl if specified
    if (tsConfig.options.baseUrl) {
      const baseUrlPath = path.resolve(repositoryPath, tsConfig.options.baseUrl as string);

      // Try resolving from baseUrl
      if (!dependency.startsWith('.') && !dependency.startsWith('/')) {
        const absolutePath = path.join(baseUrlPath, dependency);

        if (fsSync.existsSync(absolutePath)) {
          if (fsSync.statSync(absolutePath).isFile()) {
            return path.relative(repositoryPath, absolutePath);
          }

          // Check for index files
          const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
          for (const indexFile of indexFiles) {
            const indexPath = path.join(absolutePath, indexFile);
            if (fsSync.existsSync(indexPath)) {
              return path.relative(repositoryPath, indexPath);
            }
          }
        }

        // Try with extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        for (const ext of extensions) {
          const absolutePathWithExt = absolutePath + ext;
          if (fsSync.existsSync(absolutePathWithExt)) {
            return path.relative(repositoryPath, absolutePathWithExt);
          }
        }
      }
    }
  }

  // Fall back to Node.js resolution for remaining cases
  return await resolveNodeJsModule(options);
}

/**
 * Find and parse the tsconfig.json for a source file
 */
function findAndParseTsConfig(
  sourceFile: string,
  repositoryPath: string
): typescript.ParsedCommandLine | undefined {
  let dir = path.dirname(sourceFile);

  // Walk up the directory tree looking for tsconfig.json
  while (dir !== path.parse(dir).root) {
    const tsconfigPath = path.join(dir, 'tsconfig.json');

    if (fsSync.existsSync(tsconfigPath)) {
      try {
        // Read the config file content
        const configFileContent = typescript.sys.readFile(tsconfigPath);

        if (configFileContent) {
          // Parse the config file
          const configFile = typescript.parseConfigFileTextToJson(tsconfigPath, configFileContent);

          if (!configFile.error) {
            // Create a valid ParsedCommandLine object with required properties
            const parsedConfig: typescript.ParsedCommandLine = {
              options: configFile.config.compilerOptions || {},
              fileNames: [],
              errors: [],
            };

            // Add baseUrl and paths if they exist
            if (configFile.config.compilerOptions?.baseUrl) {
              parsedConfig.options.baseUrl = configFile.config.compilerOptions.baseUrl;
            }

            if (configFile.config.compilerOptions?.paths) {
              parsedConfig.options.paths = configFile.config.compilerOptions.paths;
            }

            return parsedConfig;
          }
        }
      } catch (e) {
        logError(`Error parsing tsconfig.json: ${e}`, TOOL_ID, TOOL_VERSION, e as Error);
      }
    }

    // Move up one directory
    dir = path.dirname(dir);
  }

  return undefined;
}

/**
 * Apply TypeScript path mappings to resolve a module
 */
function applyTsPathMappings(
  dependency: string,
  tsConfig: typescript.ParsedCommandLine,
  repositoryPath: string
): string[] {
  const paths = tsConfig.options.paths || {};
  const baseUrl = tsConfig.options.baseUrl || repositoryPath;
  const baseUrlAbsolute = path.resolve(repositoryPath, baseUrl as string);
  const results: string[] = [];

  // Check each path mapping
  for (const [pattern, replacements] of Object.entries(paths)) {
    // Convert TS path mapping pattern to regex
    const regexPattern = new RegExp(`^${pattern.replace(/\*/g, '([^/]*)')}$`);

    const match = dependency.match(regexPattern);
    if (match) {
      // Apply each possible replacement
      for (const replacement of replacements as string[]) {
        // Replace wildcards with captured groups
        let appliedReplacement = replacement;
        for (let i = 1; i < match.length; i++) {
          appliedReplacement = appliedReplacement.replace(/\*/, match[i]);
        }

        // Add resolved path
        results.push(path.resolve(baseUrlAbsolute, appliedReplacement));
      }
    }
  }

  return results;
}

/**
 * Python module resolution algorithm
 */
async function resolvePythonModule(options: ResolutionOptions): Promise<string | null> {
  const { sourceFile, dependency, repositoryPath } = options;
  const sourceDir = path.dirname(sourceFile);

  // Handle absolute imports (package names)
  if (!dependency.startsWith('.')) {
    // Split the import path into parts
    const parts = dependency.split('.');
    const rootPackage = parts[0];

    // Find potential Python package directories
    const pythonPaths = options.pythonPath || [
      repositoryPath,
      ...findPotentialPythonPaths(sourceFile, repositoryPath),
    ];

    // Look for the package in each path
    for (const pythonPath of pythonPaths) {
      const packageDir = path.join(pythonPath, rootPackage);

      // Package exists as a directory
      if (fsSync.existsSync(packageDir) && fsSync.statSync(packageDir).isDirectory()) {
        // Check if it's a valid Python package
        const initPy = path.join(packageDir, '__init__.py');
        if (fsSync.existsSync(initPy)) {
          // If only requesting the root package
          if (parts.length === 1) {
            return path.relative(repositoryPath, initPy);
          }

          // Navigate to submodule
          let currentDir = packageDir;
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const nextDir = path.join(currentDir, part);

            // Check if it's a directory with __init__.py
            if (fsSync.existsSync(nextDir) && fsSync.statSync(nextDir).isDirectory()) {
              const subInitPy = path.join(nextDir, '__init__.py');
              if (fsSync.existsSync(subInitPy)) {
                currentDir = nextDir;
                // If this is the last part, return the __init__.py
                if (i === parts.length - 1) {
                  return path.relative(repositoryPath, subInitPy);
                }
                continue;
              }
            }

            // Check if it's a .py file
            const pyFile = path.join(currentDir, `${part}.py`);
            if (fsSync.existsSync(pyFile)) {
              return path.relative(repositoryPath, pyFile);
            }

            // Not found
            break;
          }
        }
        // Check for single-file module (no __init__.py needed at root)
        else {
          const pyFile = path.join(pythonPath, `${rootPackage}.py`);
          if (fsSync.existsSync(pyFile)) {
            return path.relative(repositoryPath, pyFile);
          }
        }
      }
      // Check for single-file module
      else {
        const pyFile = path.join(pythonPath, `${rootPackage}.py`);
        if (fsSync.existsSync(pyFile)) {
          if (parts.length === 1) {
            return path.relative(repositoryPath, pyFile);
          }
          // Python doesn't support further imports from a single file module
        }
      }
    }

    // Not found as a local module, assume it's an external library
    return dependency;
  }

  // Handle relative imports
  else {
    // Count leading dots
    let leadingDots = 0;
    while (dependency[leadingDots] === '.') {
      leadingDots++;
    }

    // Calculate target directory
    let targetDir = sourceDir;
    for (let i = 1; i < leadingDots; i++) {
      targetDir = path.dirname(targetDir);
    }

    // Get the import parts after the dots
    const importPath = dependency.substring(leadingDots);
    const parts = importPath ? importPath.split('.') : [];

    // Empty part means importing the package itself
    if (parts.length === 0) {
      const initPy = path.join(targetDir, '__init__.py');
      if (fsSync.existsSync(initPy)) {
        return path.relative(repositoryPath, initPy);
      }
      return null;
    }

    // Navigate through parts
    let currentDir = targetDir;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const nextDir = path.join(currentDir, part);

      // Check if it's a directory with __init__.py
      if (fsSync.existsSync(nextDir) && fsSync.statSync(nextDir).isDirectory()) {
        const initPy = path.join(nextDir, '__init__.py');
        if (fsSync.existsSync(initPy)) {
          currentDir = nextDir;
          // If this is the last part, return the __init__.py
          if (i === parts.length - 1) {
            return path.relative(repositoryPath, initPy);
          }
          continue;
        }
      }

      // Check if it's a .py file
      const pyFile = path.join(currentDir, `${part}.py`);
      if (fsSync.existsSync(pyFile)) {
        return path.relative(repositoryPath, pyFile);
      }

      // Not found
      break;
    }
  }

  // Not resolved
  logWarning(
    `Couldn't resolve Python module: ${dependency} from ${sourceFile}`,
    TOOL_ID,
    TOOL_VERSION
  );
  return dependency;
}

/**
 * Find potential Python path directories
 */
function findPotentialPythonPaths(sourceFile: string, repositoryPath: string): string[] {
  const paths: string[] = [];
  let dir = path.dirname(sourceFile);

  // Walk up the directory tree
  while (dir !== path.parse(dir).root && dir.startsWith(repositoryPath)) {
    // Check for common virtual environment patterns
    const venvDirs = ['venv', 'env', '.venv', '.env', 'virtualenv'];
    for (const venvDir of venvDirs) {
      const venvPath = path.join(dir, venvDir, 'lib');
      if (fsSync.existsSync(venvPath) && fsSync.statSync(venvPath).isDirectory()) {
        // Look for python version directories
        const libContents = fsSync.readdirSync(venvPath);
        for (const item of libContents) {
          if (item.startsWith('python')) {
            const sitePkgs = path.join(venvPath, item, 'site-packages');
            if (fsSync.existsSync(sitePkgs)) {
              paths.push(sitePkgs);
            }
          }
        }
      }
    }

    // Add current directory
    paths.push(dir);

    // Move up one level
    dir = path.dirname(dir);
  }

  return paths;
}

/**
 * Java module resolution algorithm
 */
async function resolveJavaModule(options: ResolutionOptions): Promise<string | null> {
  const { sourceFile, dependency, repositoryPath } = options;

  // Java uses fully qualified class names
  // Convert package dots to directory structure
  const packagePath = dependency.replace(/\./g, '/');

  // Find potential source and class directories
  const sourceDirs = ['src/main/java', 'src'];
  const potentialPaths = [];

  // Find all potential source roots by walking up from the source file
  let dir = path.dirname(sourceFile);
  while (dir !== path.parse(dir).root && dir.startsWith(repositoryPath)) {
    for (const sourceDir of sourceDirs) {
      const fullSourceDir = path.join(dir, sourceDir);
      if (fsSync.existsSync(fullSourceDir) && fsSync.statSync(fullSourceDir).isDirectory()) {
        potentialPaths.push(path.join(fullSourceDir, `${packagePath}.java`));
      }
    }
    dir = path.dirname(dir);
  }

  // Check each potential path
  for (const potentialPath of potentialPaths) {
    if (fsSync.existsSync(potentialPath)) {
      return path.relative(repositoryPath, potentialPath);
    }
  }

  // Not found, return the original dependency
  return dependency;
}

/**
 * Go module resolution algorithm
 */
async function resolveGoModule(options: ResolutionOptions): Promise<string | null> {
  const { sourceFile, dependency, repositoryPath } = options;

  // Handle standard library imports
  const stdLibPatterns = [
    'fmt',
    'os',
    'net',
    'http',
    'io',
    'strings',
    'strconv',
    'time',
    'encoding',
    'json',
    'context',
    'log',
    'errors',
    'sync',
    'reflect',
    'path',
    'bytes',
    'math',
    'sort',
  ];

  // Check if it's a standard library
  for (const stdLib of stdLibPatterns) {
    if (dependency === stdLib || dependency.startsWith(stdLib + '/')) {
      return dependency; // Return as is for standard libraries
    }
  }

  // Look for go.mod file to determine the module structure
  let dir = path.dirname(sourceFile);
  let goModPath = '';

  while (dir !== path.parse(dir).root && dir.startsWith(repositoryPath)) {
    const testGoMod = path.join(dir, 'go.mod');

    if (fsSync.existsSync(testGoMod)) {
      goModPath = testGoMod;
      break;
    }

    dir = path.dirname(dir);
  }

  if (goModPath) {
    const moduleRoot = path.dirname(goModPath);
    let moduleContent = '';

    try {
      moduleContent = fsSync.readFileSync(goModPath, 'utf-8');
    } catch (e) {
      console.error('Error reading go.mod file:', e);
    }

    // Extract the module name from go.mod
    const moduleNameMatch = moduleContent.match(/module\s+([^\s]+)/);
    const moduleName = moduleNameMatch ? moduleNameMatch[1] : null;

    if (moduleName) {
      // Check if the import is within the same module
      if (dependency.startsWith(moduleName + '/')) {
        const relativePath = dependency.substring(moduleName.length + 1);
        const fullPath = path.join(moduleRoot, relativePath);

        if (fsSync.existsSync(fullPath)) {
          if (fsSync.statSync(fullPath).isDirectory()) {
            // Look for Go files inside the directory
            const goFiles = fsSync
              .readdirSync(fullPath)
              .filter((file) => file.endsWith('.go') && !file.endsWith('_test.go'));

            if (goFiles.length > 0) {
              return path.relative(repositoryPath, path.join(fullPath, goFiles[0]));
            }
          } else {
            return path.relative(repositoryPath, fullPath);
          }
        }
      } else {
        // Internal relative import
        if (dependency.startsWith('./') || dependency.startsWith('../')) {
          const fullPath = path.resolve(path.dirname(sourceFile), dependency);

          if (fsSync.existsSync(fullPath)) {
            return path.relative(repositoryPath, fullPath);
          }

          // Check if it's a directory with Go files
          if (fsSync.existsSync(fullPath) && fsSync.statSync(fullPath).isDirectory()) {
            const goFiles = fsSync
              .readdirSync(fullPath)
              .filter((file) => file.endsWith('.go') && !file.endsWith('_test.go'));

            if (goFiles.length > 0) {
              return path.relative(repositoryPath, path.join(fullPath, goFiles[0]));
            }
          }
        } else {
          // Try to find in GOPATH/pkg/mod
          // This is simplified as we can't access GOPATH directly
          // External dependencies are treated as external
        }
      }
    }
  }

  // For external dependencies or unresolved paths, return the original import
  return dependency;
}

/**
 * Ruby module resolution algorithm
 */
async function resolveRubyModule(options: ResolutionOptions): Promise<string | null> {
  const { sourceFile, dependency, repositoryPath } = options;

  // Handle standard library imports
  const stdLibPatterns = [
    'json',
    'csv',
    'date',
    'time',
    'fileutils',
    'pathname',
    'yaml',
    'net/http',
    'uri',
    'openssl',
    'logger',
    'digest',
    'securerandom',
    'stringio',
    'base64',
    'tempfile',
    'set',
  ];

  // Check for standard libraries
  for (const stdLib of stdLibPatterns) {
    if (dependency === stdLib || dependency.startsWith(stdLib + '/')) {
      return dependency; // Return as is for standard libraries
    }
  }

  // Look for Gemfile or .gemspec to determine the project structure
  let dir = path.dirname(sourceFile);
  let gemfilePath = '';
  let gemspecPath = '';

  while (dir !== path.parse(dir).root && dir.startsWith(repositoryPath)) {
    const testGemfile = path.join(dir, 'Gemfile');
    const testGemspecFiles = fsSync.readdirSync(dir).filter((file) => file.endsWith('.gemspec'));

    if (fsSync.existsSync(testGemfile)) {
      gemfilePath = testGemfile;
      break;
    }

    if (testGemspecFiles.length > 0) {
      gemspecPath = path.join(dir, testGemspecFiles[0]);
      break;
    }

    dir = path.dirname(dir);
  }

  const projectRoot = gemfilePath
    ? path.dirname(gemfilePath)
    : gemspecPath
      ? path.dirname(gemspecPath)
      : null;

  if (projectRoot) {
    // Handle relative requires
    if (dependency.startsWith('./') || dependency.startsWith('../')) {
      const requirePath = path.resolve(path.dirname(sourceFile), dependency);

      // Check for .rb extension
      const possiblePaths = [requirePath, requirePath + '.rb'];

      for (const possiblePath of possiblePaths) {
        if (fsSync.existsSync(possiblePath)) {
          return path.relative(repositoryPath, possiblePath);
        }
      }
    } else {
      // Try to resolve from lib directory (common Ruby convention)
      const libPath = path.join(projectRoot, 'lib');
      if (fsSync.existsSync(libPath)) {
        const possiblePaths = [
          path.join(libPath, dependency + '.rb'),
          path.join(libPath, dependency, 'index.rb'),
          path.join(libPath, dependency),
        ];

        for (const possiblePath of possiblePaths) {
          if (fsSync.existsSync(possiblePath)) {
            if (fsSync.statSync(possiblePath).isDirectory()) {
              // Look for Ruby files inside the directory
              const rubyFiles = fsSync
                .readdirSync(possiblePath)
                .filter((file) => file.endsWith('.rb'));
              if (rubyFiles.length > 0) {
                return path.relative(repositoryPath, path.join(possiblePath, rubyFiles[0]));
              }
            } else {
              return path.relative(repositoryPath, possiblePath);
            }
          }
        }
      }
    }
  }

  // For external dependencies or unresolved paths, return the original require
  return dependency;
}

/**
 * Basic fallback module resolution for other languages
 */
async function resolveBasicModule(options: ResolutionOptions): Promise<string | null> {
  const { sourceFile, dependency, repositoryPath } = options;

  // For relative imports, try to resolve
  if (dependency.startsWith('./') || dependency.startsWith('../')) {
    const sourceDir = path.dirname(sourceFile);
    const resolvedPath = path.resolve(sourceDir, dependency);

    // Check if path exists as is
    if (fsSync.existsSync(resolvedPath)) {
      return path.relative(repositoryPath, resolvedPath);
    }

    // Try common extensions
    const extensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.json',
      '.py',
      '.rb',
      '.java',
      '.go',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
    ];
    for (const ext of extensions) {
      const pathWithExt = resolvedPath + ext;
      if (fsSync.existsSync(pathWithExt)) {
        return path.relative(repositoryPath, pathWithExt);
      }
    }
  }

  // Return original for non-relative or unresolved imports
  return dependency;
}

/**
 * Resolve a dependency string to an actual file path
 * @param sourceFile Source file path
 * @param dependency Dependency string from import/require
 * @param repositoryPath Base repository path
 * @returns Resolved path or null if can't be resolved
 */
export async function resolveDependency(
  sourceFile: string,
  dependency: string,
  repositoryPath: string
): Promise<string | null> {
  // For backward compatibility, call the new resolveModule function
  return resolveModule({
    sourceFile,
    dependency,
    repositoryPath,
  });
}
