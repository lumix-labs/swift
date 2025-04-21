#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Get changed workflow files
function getChangedWorkflowFiles() {
  try {
    // Get staged files
    const output = execSync('git diff --staged --name-only', { encoding: 'utf8' });
    
    // Filter for workflow files
    return output
      .split('\n')
      .filter(file => file.startsWith('.github/workflows/') && file.endsWith('.yml'));
  } catch (error) {
    log(`Error getting changed files: ${error.message}`, colors.red);
    return [];
  }
}

// Get all workflow files
function getAllWorkflowFiles() {
  const workflowsDir = '.github/workflows';
  if (!fs.existsSync(workflowsDir)) {
    return [];
  }
  
  try {
    return fs.readdirSync(workflowsDir)
      .filter(file => file.endsWith('.yml'))
      .map(file => `${workflowsDir}/${file}`);
  } catch (error) {
    log(`Error reading workflows directory: ${error.message}`, colors.red);
    return [];
  }
}

// Parse and validate YAML syntax
function validateYamlSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    yaml.load(content);
    return true;
  } catch (error) {
    log(`YAML syntax error in ${filePath}:`, colors.red);
    log(error.message, colors.red);
    return false;
  }
}

// Validate common GitHub workflow patterns 
function validateWorkflowPatterns(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflow = yaml.load(content);
    let valid = true;
    
    // Check for basic structure
    if (!workflow.name) {
      log(`Warning: Workflow ${filePath} missing 'name' property`, colors.yellow);
    }
    
    if (!workflow.on) {
      log(`Error: Workflow ${filePath} missing 'on' trigger`, colors.red);
      valid = false;
    }
    
    if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
      log(`Error: Workflow ${filePath} has no jobs defined`, colors.red);
      valid = false;
    }
    
    // Check workflow_call pattern if it exists
    if (workflow.on && workflow.on.workflow_call) {
      const wc = workflow.on.workflow_call;
      
      // Check secrets configuration
      if (wc.secrets) {
        // GitHub Actions supports both "secrets: inherit" (as string)
        // and "secrets: inherit: true" (as object) syntax
        if (wc.secrets === "inherit") {
          // Valid: secrets: inherit (parsed as string)
          log(`Valid secrets format: 'secrets: inherit'`, colors.green);
        } else if (typeof wc.secrets === 'object') {
          if (wc.secrets.inherit !== undefined) {
            // Check if inherit is a boolean or null
            if (typeof wc.secrets.inherit !== 'boolean' && 
                wc.secrets.inherit !== null && 
                wc.secrets.inherit !== 'inherit') {
              log(`Error: When using 'secrets.inherit', value must be true, false, or null`, colors.red);
              log(`Found: ${typeof wc.secrets.inherit} with value: ${wc.secrets.inherit}`, colors.red);
              valid = false;
            }
          } else {
            // Check each secret definition for required property
            for (const [name, secret] of Object.entries(wc.secrets)) {
              if (secret.required !== undefined && typeof secret.required !== 'boolean') {
                log(`Error: Secret '${name}.required' must be a boolean in ${filePath}`, colors.red);
                valid = false;
              }
            }
          }
        } else if (wc.secrets !== 'inherit') {
          // Neither a string "inherit" nor an object with secret definitions
          log(`Error: Invalid secrets format in ${filePath}. Must be "inherit" or an object with secret definitions`, colors.red);
          valid = false;
        }
      }
      
      // Check inputs and outputs
      if (wc.inputs) {
        for (const [name, input] of Object.entries(wc.inputs)) {
          if (input.required !== undefined && typeof input.required !== 'boolean') {
            log(`Error: Input '${name}.required' must be a boolean in ${filePath}`, colors.red);
            valid = false;
          }
        }
      }
    }
    
    return valid;
  } catch (error) {
    log(`Error validating workflow patterns in ${filePath}: ${error.message}`, colors.red);
    return false;
  }
}

// Main function
function main() {
  const workflowFiles = getChangedWorkflowFiles();
  
  // If no workflow files are changed, check terraform-workflow.yml specifically
  if (workflowFiles.length === 0) {
    const terraformWorkflow = '.github/workflows/terraform-workflow.yml';
    if (fs.existsSync(terraformWorkflow)) {
      log(`No workflow files in changes, checking terraform-workflow.yml...`, colors.blue);
      
      // Basic YAML syntax validation
      if (!validateYamlSyntax(terraformWorkflow)) {
        return 1;
      }
      
      // Pattern validation
      if (!validateWorkflowPatterns(terraformWorkflow)) {
        log(`\nTerraform workflow validation failed!`, colors.red);
        return 1;
      }
      
      log(`\nTerraform workflow file is valid!`, colors.green);
      return 0;
    }
    
    log('No workflow files to validate.', colors.green);
    return 0;
  }
  
  log(`Validating ${workflowFiles.length} workflow file(s)...`, colors.blue);
  
  let success = true;
  
  for (const file of workflowFiles) {
    log(`\nChecking ${file}...`, colors.blue);
    
    // Basic YAML syntax validation
    if (!validateYamlSyntax(file)) {
      success = false;
      continue; // Skip further checks if YAML is invalid
    }
    
    // Pattern validation
    if (!validateWorkflowPatterns(file)) {
      success = false;
    }
  }
  
  if (success) {
    log('\nAll workflow files are valid!', colors.green);
    return 0;
  } else {
    log('\nWorkflow validation failed!', colors.red);
    return 1;
  }
}

// Run main function
process.exit(main());
