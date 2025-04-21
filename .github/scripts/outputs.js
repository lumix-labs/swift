/**
 * Utility for properly sanitizing and parsing Terraform outputs
 * for use in GitHub Actions workflows
 */

// Convert a value to a clean JSON-compatible string
function sanitizeOutput(value) {
  if (!value) {
    return '';
  }
  
  // Remove any trailing/leading quotes and whitespace
  return value.toString().trim().replace(/^["']|["']$/g, '');
}

// Generate a clean, compact JSON from Terraform outputs
function formatOutputAsJson(outputs) {
  const result = {};
  
  for (const [key, value] of Object.entries(outputs)) {
    result[key] = sanitizeOutput(value);
  }
  
  return JSON.stringify(result);
}

module.exports = {
  sanitizeOutput,
  formatOutputAsJson
};
