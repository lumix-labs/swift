# Swift AI Repository Analysis Extensions

This document describes the enhancements made to the repository analysis services in Swift AI.

## New Features

### Enhanced Repository Analysis
We've added two major data analysis features that are calculated during repository ingestion:

1. **Dependency Graph Analysis**
   - Maps relationships between code modules
   - Identifies high-centrality modules
   - Shows incoming and outgoing dependencies
   - Helps understand code structure and relationships

2. **API Surface Analysis**
   - Identifies public APIs, endpoints, and entry points
   - Extracts exported functions and classes
   - Maps HTTP endpoints with their methods (GET, POST, etc.)
   - Helps understand the external interface of the codebase

### AI Advisor Response Enhancement
We've improved the AI advisors' responses:

1. **Response Brevity**
   - Advisors now provide responses under 200 words by default
   - Key points are emphasized with bold markdown
   - Long responses are automatically truncated at sentence boundaries
   - System prompt includes conciseness instructions

2. **Markdown Guidance**
   - Advisors understand markdown symbols are hidden from users
   - Formatting is applied without referencing markdown syntax
   - Improved readability with proper use of headers and emphasis

## Implementation Details

### New Files
- `repo-analysis-service.ts`: Contains dependency graph and API surface analysis logic

### Modified Files
- `repo-download-service.ts`: Added dependency graph and API surface generation during ingestion
- `base-model-service.ts`: Added conciseness instructions and response processing
- `openai-service.ts`, `gemini-service.ts`, `claude-service.ts`: Updated to use new data

## Usage

The AI advisors automatically receive this additional context. No explicit changes are needed in how users interact with the system. The AI advisors will provide more insightful but concise answers about:

1. Code relationships and dependencies
2. API endpoints and exported interfaces
3. Central/important modules in the codebase

## Technical Considerations

- Analysis is done at ingestion time to avoid performance impact during chat
- The data is stored in localStorage along with other repository information
- Response brevity is enforced both in system prompt and post-processing
