// filepath: /Users/oizys/Desktop/lumix-labs/swift/mcp-server/src/tools/architecture-analyzer/framework-detector.ts
/**
 * Framework detection and specialized dependency analysis
 *
 * This module provides functionality to detect and analyze framework-specific
 * dependency patterns for common frameworks like React, Angular, Vue, Spring, etc.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { logInfo, logWarning } from '../../utils/index.js';

const TOOL_ID = 'architecture-analyzer';
const TOOL_VERSION = '0.1.0';

/**
 * Framework types supported for specialized analysis
 */
export enum FrameworkType {
  React = 'react',
  Angular = 'angular',
  Vue = 'vue',
  NextJs = 'nextjs',
  Express = 'express',
  NestJs = 'nestjs',
  Spring = 'spring',
  Django = 'django',
  Flask = 'flask',
  Laravel = 'laravel',
  RubyOnRails = 'rails',
  DotNetCore = 'dotnetcore',
  Unknown = 'unknown',
}

/**
 * Framework detection result with metadata
 */
export interface FrameworkInfo {
  type: FrameworkType;
  version?: string;
  confidence: number; // 0-1 indicating confidence level
  features: string[]; // Framework-specific features detected
}

/**
 * Framework-specific dependency that has special meaning
 */
export interface FrameworkDependency {
  source: string;
  target: string;
  framework: FrameworkType;
  dependencyType: string; // Framework-specific dependency type (e.g., 'component', 'service', 'directive')
  significance: 'high' | 'medium' | 'low'; // Importance of this relationship
  description: string; // Human-readable description
}

/**
 * Detect the framework used in a project based on dependencies and files
 * @param repositoryPath Path to the repository
 * @returns Information about detected frameworks
 */
export async function detectFrameworks(repositoryPath: string): Promise<FrameworkInfo[]> {
  const detectedFrameworks: FrameworkInfo[] = [];

  try {
    // Check for package.json for JS/TS projects
    const packageJsonPath = path.join(repositoryPath, 'package.json');
    if (fsSync.existsSync(packageJsonPath)) {
      const packageJsonFrameworks = await detectFromPackageJson(packageJsonPath);
      detectedFrameworks.push(...packageJsonFrameworks);
    }

    // Check for pom.xml for Java/Spring projects
    const pomXmlPath = path.join(repositoryPath, 'pom.xml');
    if (fsSync.existsSync(pomXmlPath)) {
      const springFramework = await detectSpringFramework(pomXmlPath);
      if (springFramework) {
        detectedFrameworks.push(springFramework);
      }
    }

    // Check for requirements.txt or pyproject.toml for Python projects
    const requirementsPath = path.join(repositoryPath, 'requirements.txt');
    const pyprojectPath = path.join(repositoryPath, 'pyproject.toml');

    if (fsSync.existsSync(requirementsPath)) {
      const pythonFrameworks = await detectPythonFrameworks(requirementsPath);
      detectedFrameworks.push(...pythonFrameworks);
    } else if (fsSync.existsSync(pyprojectPath)) {
      const pythonFrameworks = await detectPythonFromPyproject(pyprojectPath);
      detectedFrameworks.push(...pythonFrameworks);
    }

    // Check for composer.json for PHP/Laravel projects
    const composerJsonPath = path.join(repositoryPath, 'composer.json');
    if (fsSync.existsSync(composerJsonPath)) {
      const laravelFramework = await detectLaravelFramework(composerJsonPath);
      if (laravelFramework) {
        detectedFrameworks.push(laravelFramework);
      }
    }

    // Check for Gemfile for Ruby/Rails projects
    const gemfilePath = path.join(repositoryPath, 'Gemfile');
    if (fsSync.existsSync(gemfilePath)) {
      const railsFramework = await detectRubyOnRailsFramework(gemfilePath);
      if (railsFramework) {
        detectedFrameworks.push(railsFramework);
      }
    }

    // Check for .csproj files for .NET projects
    const csprojFiles = await findFiles(repositoryPath, '.csproj');
    if (csprojFiles.length > 0) {
      const dotnetFramework = await detectDotNetFramework(csprojFiles[0]);
      if (dotnetFramework) {
        detectedFrameworks.push(dotnetFramework);
      }
    }
  } catch (error: any) {
    logWarning(`Error detecting frameworks: ${error.message}`, TOOL_ID, TOOL_VERSION);
  }

  return detectedFrameworks;
}

/**
 * Detects frameworks from package.json
 */
async function detectFromPackageJson(packageJsonPath: string): Promise<FrameworkInfo[]> {
  const frameworks: FrameworkInfo[] = [];

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for React
    if (dependencies.react) {
      frameworks.push({
        type: FrameworkType.React,
        version: dependencies.react,
        confidence: 0.9,
        features: [...findReactFeatures(dependencies), 'jsx'],
      });
    }

    // Check for Angular
    if (dependencies['@angular/core']) {
      frameworks.push({
        type: FrameworkType.Angular,
        version: dependencies['@angular/core'],
        confidence: 0.9,
        features: [
          'dependency-injection',
          'component-based',
          'services',
          'modules',
          ...findAngularFeatures(dependencies),
        ],
      });
    }

    // Check for Vue
    if (dependencies.vue) {
      frameworks.push({
        type: FrameworkType.Vue,
        version: dependencies.vue,
        confidence: 0.9,
        features: ['component-based', 'single-file-components', ...findVueFeatures(dependencies)],
      });
    }

    // Check for Next.js
    if (dependencies.next) {
      frameworks.push({
        type: FrameworkType.NextJs,
        version: dependencies.next,
        confidence: 0.9,
        features: [
          'server-side-rendering',
          'file-system-routing',
          'api-routes',
          ...(dependencies.react ? ['react-based'] : []),
        ],
      });
    }

    // Check for Express.js
    if (dependencies.express) {
      frameworks.push({
        type: FrameworkType.Express,
        version: dependencies.express,
        confidence: 0.8,
        features: ['middleware', 'routing', 'http-server'],
      });
    }

    // Check for NestJS
    if (dependencies['@nestjs/core']) {
      frameworks.push({
        type: FrameworkType.NestJs,
        version: dependencies['@nestjs/core'],
        confidence: 0.9,
        features: ['dependency-injection', 'modules', 'controllers', 'providers'],
      });
    }
  } catch (error: any) {
    logWarning(`Error parsing package.json: ${error.message}`, TOOL_ID, TOOL_VERSION);
  }

  return frameworks;
}

/**
 * Find React-specific features based on dependencies
 */
function findReactFeatures(dependencies: Record<string, string>): string[] {
  const features: string[] = [];

  if (dependencies['react-dom']) features.push('web');
  if (dependencies['react-native']) features.push('mobile');
  if (dependencies['react-router'] || dependencies['react-router-dom']) features.push('routing');
  if (dependencies.redux || dependencies['@reduxjs/toolkit']) features.push('redux');
  if (dependencies.mobx) features.push('mobx');
  if (dependencies['styled-components']) features.push('styled-components');
  if (dependencies['@emotion/react']) features.push('emotion');

  return features;
}

/**
 * Find Angular-specific features based on dependencies
 */
function findAngularFeatures(dependencies: Record<string, string>): string[] {
  const features: string[] = [];

  if (dependencies['@angular/router']) features.push('routing');
  if (dependencies['@angular/forms']) features.push('forms');
  if (dependencies['@angular/material']) features.push('material-design');
  if (dependencies['@ngrx/store']) features.push('ngrx');
  if (dependencies['@angular/platform-server']) features.push('server-side-rendering');

  return features;
}

/**
 * Find Vue-specific features based on dependencies
 */
function findVueFeatures(dependencies: Record<string, string>): string[] {
  const features: string[] = [];

  if (dependencies['vue-router']) features.push('routing');
  if (dependencies.vuex) features.push('state-management');
  if (dependencies.pinia) features.push('pinia-state');
  if (dependencies['@vue/composition-api'] || parseVersion(dependencies.vue)?.startsWith('3')) {
    features.push('composition-api');
  }
  if (dependencies['nuxt']) features.push('nuxt-framework');

  return features;
}

/**
 * Extract version number from semver string
 */
function parseVersion(versionString?: string): string | null {
  if (!versionString) return null;

  // Handle semver ranges like ^1.0.0, ~2.0.0, etc.
  const match = versionString.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : null;
}

/**
 * Detect Spring framework from pom.xml
 */
async function detectSpringFramework(pomXmlPath: string): Promise<FrameworkInfo | null> {
  try {
    const pomContent = await fs.readFile(pomXmlPath, 'utf-8');

    // Simple check for Spring dependencies
    if (pomContent.includes('org.springframework') || pomContent.includes('spring-boot')) {
      const isSpringBoot = pomContent.includes('spring-boot');
      const features = ['dependency-injection', 'aop'];

      if (isSpringBoot) {
        features.push('auto-configuration', 'embedded-server');
      }

      if (pomContent.includes('spring-webmvc') || pomContent.includes('spring-web')) {
        features.push('web-mvc');
      }

      if (pomContent.includes('spring-data')) {
        features.push('data-repositories');
      }

      if (pomContent.includes('spring-security')) {
        features.push('security');
      }

      return {
        type: FrameworkType.Spring,
        confidence: 0.8,
        features,
      };
    }
  } catch (error: any) {
    logWarning(`Error parsing pom.xml: ${error.message}`, TOOL_ID, TOOL_VERSION);
  }

  return null;
}

/**
 * Detect Python frameworks from requirements.txt
 */
async function detectPythonFrameworks(requirementsPath: string): Promise<FrameworkInfo[]> {
  const frameworks: FrameworkInfo[] = [];

  try {
    const requirementsContent = await fs.readFile(requirementsPath, 'utf-8');
    const lines = requirementsContent.split('\n');

    // Check for Django
    const djangoLine = lines.find((line) => line.trim().startsWith('Django'));
    if (djangoLine) {
      const version = djangoLine.match(/==([\d.]+)/)?.[1];
      frameworks.push({
        type: FrameworkType.Django,
        version,
        confidence: 0.9,
        features: ['orm', 'template-engine', 'admin-interface', 'auth-system'],
      });
    }

    // Check for Flask
    const flaskLine = lines.find((line) => line.trim().startsWith('Flask'));
    if (flaskLine) {
      const version = flaskLine.match(/==([\d.]+)/)?.[1];
      frameworks.push({
        type: FrameworkType.Flask,
        version,
        confidence: 0.9,
        features: ['routing', 'template-engine', 'wsgi'],
      });
    }
  } catch (error: any) {
    logWarning(`Error parsing requirements.txt: ${error.message}`, TOOL_ID, TOOL_VERSION);
  }

  return frameworks;
}

/**
 * Detect Python frameworks from pyproject.toml
 */
async function detectPythonFromPyproject(pyprojectPath: string): Promise<FrameworkInfo[]> {
  const frameworks: FrameworkInfo[] = [];

  try {
    const pyprojectContent = await fs.readFile(pyprojectPath, 'utf-8');

    // Simple check for frameworks
    if (pyprojectContent.includes('django')) {
      frameworks.push({
        type: FrameworkType.Django,
        confidence: 0.8,
        features: ['orm', 'template-engine', 'admin-interface', 'auth-system'],
      });
    }

    if (pyprojectContent.includes('flask')) {
      frameworks.push({
        type: FrameworkType.Flask,
        confidence: 0.8,
        features: ['routing', 'template-engine', 'wsgi'],
      });
    }
  } catch (error: any) {
    logWarning(`Error parsing pyproject.toml: ${error.message}`, TOOL_ID, TOOL_VERSION);
  }

  return frameworks;
}

/**
 * Detect Laravel framework from composer.json
 */
async function detectLaravelFramework(composerJsonPath: string): Promise<FrameworkInfo | null> {
  try {
    const composerContent = await fs.readFile(composerJsonPath, 'utf-8');
    const composerJson = JSON.parse(composerContent);

    if (composerJson.require && composerJson.require['laravel/framework']) {
      return {
        type: FrameworkType.Laravel,
        version: composerJson.require['laravel/framework'],
        confidence: 0.9,
        features: ['routing', 'orm', 'blade-templates', 'middleware'],
      };
    }
  } catch (error: any) {
    logWarning(`Error parsing composer.json: ${error.message}`, TOOL_ID, TOOL_VERSION);
  }

  return null;
}

/**
 * Detect Ruby on Rails from Gemfile
 */
async function detectRubyOnRailsFramework(gemfilePath: string): Promise<FrameworkInfo | null> {
  try {
    const gemfileContent = await fs.readFile(gemfilePath, 'utf-8');

    if (gemfileContent.includes('gem "rails"') || gemfileContent.includes("gem 'rails'")) {
      return {
        type: FrameworkType.RubyOnRails,
        confidence: 0.9,
        features: ['mvc', 'orm', 'routing', 'asset-pipeline'],
      };
    }
  } catch (error: any) {
    logWarning(`Error parsing Gemfile: ${error.message}`, TOOL_ID, TOOL_VERSION);
  }

  return null;
}

/**
 * Detect .NET framework from .csproj file
 */
async function detectDotNetFramework(csprojPath: string): Promise<FrameworkInfo | null> {
  try {
    const csprojContent = await fs.readFile(csprojPath, 'utf-8');

    if (
      csprojContent.includes('Microsoft.AspNetCore') ||
      csprojContent.includes('Microsoft.NET.Sdk.Web')
    ) {
      return {
        type: FrameworkType.DotNetCore,
        confidence: 0.8,
        features: ['mvc', 'razor-pages', 'dependency-injection'],
      };
    }
  } catch (error: any) {
    logWarning(`Error parsing .csproj file: ${error.message}`, TOOL_ID, TOOL_VERSION);
  }

  return null;
}

/**
 * Find files with specific extension
 */
async function findFiles(dir: string, ext: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other common directories that should be ignored
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }

        const nestedFiles = await findFiles(fullPath, ext);
        files.push(...nestedFiles);
      } else if (entry.name.endsWith(ext)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore errors for directories we can't access
  }

  return files;
}

/**
 * Analyze framework-specific imports for a JavaScript/TypeScript file
 * @param filePath Path to the file
 * @param dependencies Raw dependencies extracted from the file
 * @param detectedFrameworks Frameworks detected in the project
 * @returns Framework-specific dependency information
 */
export async function analyzeFrameworkImports(
  filePath: string,
  dependencies: string[],
  detectedFrameworks: FrameworkInfo[]
): Promise<FrameworkDependency[]> {
  const frameworkDependencies: FrameworkDependency[] = [];
  const fileContent = await fs.readFile(filePath, 'utf-8');

  // Process dependencies based on detected frameworks
  for (const framework of detectedFrameworks) {
    switch (framework.type) {
      case FrameworkType.React:
        frameworkDependencies.push(...analyzeReactImports(filePath, dependencies, fileContent));
        break;
      case FrameworkType.Angular:
        frameworkDependencies.push(...analyzeAngularImports(filePath, dependencies, fileContent));
        break;
      case FrameworkType.Vue:
        frameworkDependencies.push(...analyzeVueImports(filePath, dependencies, fileContent));
        break;
      case FrameworkType.Spring:
        frameworkDependencies.push(...analyzeSpringImports(filePath, dependencies, fileContent));
        break;
      case FrameworkType.NextJs:
        frameworkDependencies.push(...analyzeNextJsImports(filePath, dependencies, fileContent));
        break;
      // Add more framework-specific analyzers as needed
    }
  }

  return frameworkDependencies;
}

/**
 * Analyze React-specific imports and their significance
 */
function analyzeReactImports(
  filePath: string,
  dependencies: string[],
  fileContent: string
): FrameworkDependency[] {
  const frameworkDeps: FrameworkDependency[] = [];

  // Handle React component imports
  const componentDeps = dependencies.filter((dep) => {
    // Look for component-like imports (PascalCase)
    const baseName = path.basename(dep, path.extname(dep));
    const isPascalCase = /^[A-Z][A-Za-z0-9]*$/.test(baseName);

    // Exclude node_modules and common non-component imports
    const isNotNodeModule = !dep.includes('node_modules') && !dep.startsWith('@');
    const isNotUtilOrLib = !['/utils/', '/lib/', '/helpers/', '/constants/'].some((p) =>
      dep.includes(p)
    );

    return isPascalCase && isNotNodeModule && isNotUtilOrLib;
  });

  for (const dep of componentDeps) {
    frameworkDeps.push({
      source: filePath,
      target: dep,
      framework: FrameworkType.React,
      dependencyType: 'component',
      significance: 'high',
      description: 'React component dependency',
    });
  }

  // Handle Redux dependencies
  if (dependencies.some((dep) => dep.includes('redux') || dep.includes('store'))) {
    const hasReduxConnect = fileContent.includes('connect(') || fileContent.includes('useSelector');

    if (hasReduxConnect) {
      const storeDeps = dependencies.filter(
        (dep) =>
          dep.includes('/store/') ||
          dep.includes('/redux/') ||
          dep.includes('/actions/') ||
          dep.includes('/reducers/') ||
          dep.includes('/slices/')
      );

      for (const dep of storeDeps) {
        frameworkDeps.push({
          source: filePath,
          target: dep,
          framework: FrameworkType.React,
          dependencyType: 'redux',
          significance: 'high',
          description: 'Redux state management dependency',
        });
      }
    }
  }

  // Handle React hooks dependencies
  const isHookFile = path.basename(filePath).startsWith('use');
  const importsHooks =
    fileContent.includes('useState') ||
    fileContent.includes('useEffect') ||
    fileContent.includes('useContext');

  if (isHookFile || importsHooks) {
    const hookDeps = dependencies.filter(
      (dep) => path.basename(dep).startsWith('use') || dep.includes('/hooks/')
    );

    for (const dep of hookDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.React,
        dependencyType: 'hook',
        significance: 'medium',
        description: 'React hook dependency',
      });
    }
  }

  // Handle context API
  if (fileContent.includes('createContext') || fileContent.includes('useContext')) {
    const contextDeps = dependencies.filter(
      (dep) => dep.includes('Context') || dep.includes('/context/')
    );

    for (const dep of contextDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.React,
        dependencyType: 'context',
        significance: 'high',
        description: 'React context dependency',
      });
    }
  }

  return frameworkDeps;
}

/**
 * Analyze Angular-specific imports and their significance
 */
function analyzeAngularImports(
  filePath: string,
  dependencies: string[],
  fileContent: string
): FrameworkDependency[] {
  const frameworkDeps: FrameworkDependency[] = [];

  // Handle Angular component/service/module dependencies
  const isComponent = fileContent.includes('@Component');
  const isService = fileContent.includes('@Injectable');
  const isModule = fileContent.includes('@NgModule');
  const isDirective = fileContent.includes('@Directive');
  const isPipe = fileContent.includes('@Pipe');

  // Handle module imports
  if (isModule) {
    const moduleDeps = dependencies.filter(
      (dep) => dep.includes('Module') || dep.endsWith('/module')
    );

    for (const dep of moduleDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.Angular,
        dependencyType: 'module',
        significance: 'high',
        description: 'Angular module dependency',
      });
    }
  }

  // Handle service injections
  if (isComponent || isService || isDirective || isPipe) {
    const serviceDeps = dependencies.filter(
      (dep) => dep.includes('Service') || dep.endsWith('/service') || dep.includes('/services/')
    );

    for (const dep of serviceDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.Angular,
        dependencyType: 'service',
        significance: 'high',
        description: 'Angular service injection',
      });
    }
  }

  // Handle component dependencies
  if (isComponent) {
    const componentDeps = dependencies.filter(
      (dep) =>
        dep.includes('Component') || dep.endsWith('/component') || dep.includes('/components/')
    );

    for (const dep of componentDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.Angular,
        dependencyType: 'component',
        significance: 'medium',
        description: 'Angular component dependency',
      });
    }
  }

  // Handle directive dependencies
  const directiveDeps = dependencies.filter(
    (dep) => dep.includes('Directive') || dep.endsWith('/directive') || dep.includes('/directives/')
  );

  for (const dep of directiveDeps) {
    frameworkDeps.push({
      source: filePath,
      target: dep,
      framework: FrameworkType.Angular,
      dependencyType: 'directive',
      significance: 'medium',
      description: 'Angular directive dependency',
    });
  }

  return frameworkDeps;
}

/**
 * Analyze Vue-specific imports and their significance
 */
function analyzeVueImports(
  filePath: string,
  dependencies: string[],
  fileContent: string
): FrameworkDependency[] {
  const frameworkDeps: FrameworkDependency[] = [];

  // Check if this is a Vue component (SFC or JS/TS component)
  const isVueComponent =
    filePath.endsWith('.vue') ||
    fileContent.includes('defineComponent') ||
    fileContent.includes('Vue.component') ||
    fileContent.includes('Vue.extend');

  // Check for component-like dependencies
  if (isVueComponent) {
    const componentDeps = dependencies.filter((dep) => {
      const baseName = path.basename(dep, path.extname(dep));
      // Vue components often use PascalCase or kebab-case
      const isPascalCase = /^[A-Z][A-Za-z0-9]*$/.test(baseName);
      const isKebabCase = /^[a-z][a-z0-9-]*$/.test(baseName);

      return (isPascalCase || isKebabCase) && !dep.includes('node_modules');
    });

    for (const dep of componentDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.Vue,
        dependencyType: 'component',
        significance: 'high',
        description: 'Vue component dependency',
      });
    }
  }

  // Handle Vuex store dependencies
  const hasStoreImport = dependencies.some(
    (dep) => dep.includes('/store/') || dep.includes('vuex')
  );

  if (hasStoreImport || fileContent.includes('mapState') || fileContent.includes('useStore')) {
    const storeDeps = dependencies.filter(
      (dep) => dep.includes('/store/') || dep.includes('/modules/')
    );

    for (const dep of storeDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.Vue,
        dependencyType: 'store',
        significance: 'high',
        description: 'Vuex store dependency',
      });
    }
  }

  // Handle Vue composition API
  if (
    fileContent.includes('import { ref') ||
    fileContent.includes('import { reactive') ||
    fileContent.includes('import { computed')
  ) {
    const composableDeps = dependencies.filter(
      (dep) =>
        (dep.startsWith('./use') || dep.includes('/composables/')) && !dep.includes('node_modules')
    );

    for (const dep of composableDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.Vue,
        dependencyType: 'composable',
        significance: 'medium',
        description: 'Vue composable function dependency',
      });
    }
  }

  return frameworkDeps;
}

/**
 * Analyze Spring-specific imports and their significance
 */
function analyzeSpringImports(
  filePath: string,
  dependencies: string[],
  fileContent: string
): FrameworkDependency[] {
  const frameworkDeps: FrameworkDependency[] = [];

  // Handle Spring annotations and patterns
  const isController =
    fileContent.includes('@Controller') || fileContent.includes('@RestController');
  const isService = fileContent.includes('@Service');
  const isRepository = fileContent.includes('@Repository');
  const isComponent = fileContent.includes('@Component');
  const isConfiguration = fileContent.includes('@Configuration');

  // Check if the file imports org.springframework
  const hasSpringImports = dependencies.some((dep) => dep.includes('springframework'));

  if (
    hasSpringImports ||
    isController ||
    isService ||
    isRepository ||
    isComponent ||
    isConfiguration
  ) {
    // Handle controller dependencies
    if (isController) {
      const serviceDeps = dependencies.filter(
        (dep) => dep.includes('Service') || dep.endsWith('Service')
      );

      for (const dep of serviceDeps) {
        frameworkDeps.push({
          source: filePath,
          target: dep,
          framework: FrameworkType.Spring,
          dependencyType: 'service-injection',
          significance: 'high',
          description: 'Spring controller-service dependency',
        });
      }
    }

    // Handle service dependencies
    if (isService) {
      const repoDeps = dependencies.filter(
        (dep) => dep.includes('Repository') || dep.endsWith('Repository')
      );

      for (const dep of repoDeps) {
        frameworkDeps.push({
          source: filePath,
          target: dep,
          framework: FrameworkType.Spring,
          dependencyType: 'repository-injection',
          significance: 'high',
          description: 'Spring service-repository dependency',
        });
      }
    }

    // Handle configuration dependencies
    if (isConfiguration) {
      const beanDeps = dependencies.filter(
        (dep) => !dep.includes('springframework') && !dep.includes('java.')
      );

      for (const dep of beanDeps) {
        frameworkDeps.push({
          source: filePath,
          target: dep,
          framework: FrameworkType.Spring,
          dependencyType: 'bean-configuration',
          significance: 'medium',
          description: 'Spring configuration dependency',
        });
      }
    }
  }

  return frameworkDeps;
}

/**
 * Analyze Next.js-specific imports and their significance
 */
function analyzeNextJsImports(
  filePath: string,
  dependencies: string[],
  fileContent: string
): FrameworkDependency[] {
  const frameworkDeps: FrameworkDependency[] = [];

  // Check Next.js page or API route patterns
  const isNextPage = filePath.includes('/pages/') || filePath.includes('/app/');
  const isApiRoute = filePath.includes('/api/') || filePath.includes('/app/api/');

  // Handle Next.js-specific imports
  const nextImports = dependencies.filter((dep) => dep.startsWith('next/') || dep === 'next');

  if (isNextPage) {
    // Handle component dependencies for pages
    const componentDeps = dependencies.filter((dep) => {
      const baseName = path.basename(dep, path.extname(dep));
      const isPascalCase = /^[A-Z][A-Za-z0-9]*$/.test(baseName);
      return isPascalCase && !dep.includes('node_modules');
    });

    for (const dep of componentDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.NextJs,
        dependencyType: 'component',
        significance: 'high',
        description: 'Next.js page component dependency',
      });
    }

    // Handle data fetching dependencies
    if (
      fileContent.includes('getStaticProps') ||
      fileContent.includes('getServerSideProps') ||
      fileContent.includes('getInitialProps')
    ) {
      const apiDeps = dependencies.filter(
        (dep) => dep.includes('/api/') || dep.includes('/lib/') || dep.includes('/services/')
      );

      for (const dep of apiDeps) {
        frameworkDeps.push({
          source: filePath,
          target: dep,
          framework: FrameworkType.NextJs,
          dependencyType: 'data-fetching',
          significance: 'high',
          description: 'Next.js data fetching dependency',
        });
      }
    }
  }

  if (isApiRoute) {
    // Handle service or DB dependencies for API routes
    const dbOrServiceDeps = dependencies.filter(
      (dep) =>
        dep.includes('/lib/') ||
        dep.includes('/db/') ||
        dep.includes('/services/') ||
        dep.includes('/utils/')
    );

    for (const dep of dbOrServiceDeps) {
      frameworkDeps.push({
        source: filePath,
        target: dep,
        framework: FrameworkType.NextJs,
        dependencyType: 'api-service',
        significance: 'high',
        description: 'Next.js API route service dependency',
      });
    }
  }

  return frameworkDeps;
}
