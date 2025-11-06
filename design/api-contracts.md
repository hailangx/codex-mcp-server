# Codex MCP Server - API Contracts

## MCP Protocol Integration

The Codex MCP Server implements the Model Context Protocol to provide code understanding capabilities to VS Code and other MCP clients.

## Tool Definitions

### 1. search_code

**Purpose**: Perform semantic search across the entire codebase using vector embeddings and keyword matching.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query (natural language or code snippet)",
      "minLength": 1,
      "maxLength": 1000
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results",
      "minimum": 1,
      "maximum": 50,
      "default": 10
    },
    "file_extensions": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Filter by file extensions (e.g., ['.ts', '.py'])"
    },
    "threshold": {
      "type": "number",
      "description": "Similarity threshold (0.0-1.0)",
      "minimum": 0.0,
      "maximum": 1.0,
      "default": 0.7
    }
  },
  "required": ["query"]
}
```

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"file\":{\"path\":\"src/utils.ts\",\"language\":\"typescript\"},\"symbol\":{\"name\":\"calculateSum\",\"type\":\"function\"},\"score\":0.92,\"snippet\":\"function calculateSum(a: number, b: number): number {...}\",\"line\":15,\"matches\":[{\"start\":9,\"end\":20,\"text\":\"calculateSum\"}]}]"
    }
  ]
}
```

### 2. find_symbol

**Purpose**: Find definitions of specific symbols (functions, classes, variables) across the codebase.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "symbol": {
      "type": "string",
      "description": "Symbol name to search for",
      "minLength": 1,
      "maxLength": 100
    },
    "type": {
      "type": "string",
      "enum": ["function", "class", "variable", "interface", "type", "method", "property"],
      "description": "Type of symbol to search for"
    },
    "file_path": {
      "type": "string",
      "description": "Optional: restrict search to specific file"
    }
  },
  "required": ["symbol"]
}
```

**Response Format**:
```json
{
  "content": [
    {
      "type": "text", 
      "text": "[{\"symbol\":{\"name\":\"UserService\",\"type\":\"class\",\"startLine\":10,\"endLine\":45,\"definition\":\"export class UserService {...}\",\"docstring\":\"Service for user management operations\"},\"file\":{\"path\":\"src/services/UserService.ts\"},\"score\":1.0}]"
    }
  ]
}
```

### 3. get_references

**Purpose**: Find all references and usages of a specific symbol throughout the codebase.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "symbol": {
      "type": "string", 
      "description": "Symbol name to find references for",
      "minLength": 1,
      "maxLength": 100
    },
    "file_path": {
      "type": "string",
      "description": "Optional: file path where symbol is defined"
    },
    "include_definitions": {
      "type": "boolean",
      "description": "Include symbol definitions in results",
      "default": true
    }
  },
  "required": ["symbol"]
}
```

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"file\":{\"path\":\"src/controllers/UserController.ts\"},\"line\":25,\"column\":15,\"context\":\"const service = new UserService();\",\"type\":\"usage\"},{\"file\":{\"path\":\"src/services/UserService.ts\"},\"line\":10,\"column\":1,\"context\":\"export class UserService {\",\"type\":\"definition\"}]"
    }
  ]
}
```

### 4. analyze_dependencies

**Purpose**: Analyze import/export dependencies for a specific file with configurable depth.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "File path to analyze dependencies for",
      "minLength": 1
    },
    "depth": {
      "type": "number",
      "description": "Depth of dependency analysis",
      "minimum": 1,
      "maximum": 10,
      "default": 2
    },
    "include_external": {
      "type": "boolean", 
      "description": "Include external dependencies",
      "default": false
    }
  },
  "required": ["file_path"]
}
```

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"file\":{\"path\":\"src/app.ts\"},\"dependencies\":[{\"file\":{\"path\":\"src/services/UserService.ts\"},\"importPath\":\"./services/UserService\",\"type\":\"import\",\"symbols\":[\"UserService\"],\"isExternal\":false}],\"dependents\":[{\"file\":{\"path\":\"src/index.ts\"},\"importPath\":\"./app\",\"type\":\"import\",\"symbols\":[\"app\"]}]}"
    }
  ]
}
```

### 5. get_context

**Purpose**: Get relevant code context for a file or symbol to help coding agents understand the codebase.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "File path to get context for",
      "minLength": 1
    },
    "symbol": {
      "type": "string",
      "description": "Optional: specific symbol to get context for"
    },
    "context_size": {
      "type": "number",
      "description": "Amount of context to return",
      "minimum": 1,
      "maximum": 20,
      "default": 5
    },
    "include_dependencies": {
      "type": "boolean",
      "description": "Include dependency information",
      "default": true
    }
  },
  "required": ["file_path"]
}
```

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"file\":{\"path\":\"src/utils.ts\"},\"symbols\":[{\"name\":\"calculateSum\",\"type\":\"function\",\"definition\":\"function calculateSum(a: number, b: number): number\"}],\"relatedFiles\":[{\"path\":\"src/math.ts\"}],\"dependencies\":[{\"importPath\":\"lodash\",\"symbols\":[\"merge\"],\"isExternal\":true}],\"relevantCode\":[{\"content\":\"// Mathematical utility functions\nfunction calculateSum(a: number, b: number): number {\n  return a + b;\n}\",\"startLine\":1,\"endLine\":4,\"score\":1.0}]}"
    }
  ]
}
```

### 6. index_repository

**Purpose**: Manually trigger repository indexing with options for force refresh and path targeting.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "force": {
      "type": "boolean",
      "description": "Force re-indexing of all files",
      "default": false
    },
    "path": {
      "type": "string",
      "description": "Specific path to index (default: entire repository)"
    },
    "skip_embeddings": {
      "type": "boolean",
      "description": "Skip embedding generation for faster indexing",
      "default": false
    }
  }
}
```

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"completed\",\"message\":\"Repository indexing completed for: /path/to/repo\",\"stats\":{\"filesProcessed\":1247,\"symbolsExtracted\":5832,\"embeddingsGenerated\":892,\"timeElapsed\":\"2m 34s\"}}"
    }
  ]
}
```

## Error Response Format

All tools return errors in a consistent format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: [error_type] - [detailed_message]"
    }
  ]
}
```

**Common Error Types**:
- `ValidationError` - Invalid input parameters
- `FileNotFoundError` - Requested file doesn't exist
- `DatabaseError` - Database operation failed
- `IndexingError` - Repository indexing failed
- `SearchError` - Search operation failed
- `EmbeddingError` - Embedding generation failed

## Database Schema Contracts

### Files Table
```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  hash TEXT NOT NULL,           -- SHA-256 hash for change detection
  size INTEGER NOT NULL,        -- File size in bytes
  language TEXT NOT NULL,       -- Detected programming language
  last_modified DATETIME NOT NULL,
  indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Symbols Table
```sql
CREATE TABLE symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- function, class, variable, etc.
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL, 
  start_column INTEGER NOT NULL,
  end_column INTEGER NOT NULL,
  definition TEXT NOT NULL,     -- First few lines of symbol definition
  docstring TEXT,               -- Extracted documentation
  modifiers TEXT DEFAULT '[]',  -- JSON array of modifiers (static, async, etc.)
  FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
);
```

### Embeddings Table  
```sql
CREATE TABLE embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  symbol_id INTEGER,            -- NULL for file-level embeddings
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,        -- Text content that was embedded
  embedding BLOB NOT NULL,      -- Binary Float32Array
  metadata TEXT DEFAULT '{}',   -- JSON metadata (language, type, etc.)
  FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
  FOREIGN KEY (symbol_id) REFERENCES symbols (id) ON DELETE CASCADE
);
```

### Dependencies Table
```sql
CREATE TABLE dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_file_id INTEGER NOT NULL,
  target_file_id INTEGER,       -- NULL for external dependencies
  import_path TEXT NOT NULL,    -- Original import/require path
  import_type TEXT NOT NULL,    -- import, require, include
  is_external BOOLEAN NOT NULL,
  symbols TEXT DEFAULT '[]',    -- JSON array of imported symbols
  FOREIGN KEY (source_file_id) REFERENCES files (id) ON DELETE CASCADE,
  FOREIGN KEY (target_file_id) REFERENCES files (id) ON DELETE CASCADE
);
```

## Performance Contracts

### Response Time Guarantees
- **Symbol search**: < 200ms for 90th percentile
- **Semantic search**: < 500ms for 90th percentile  
- **Reference finding**: < 300ms for 90th percentile
- **Dependency analysis**: < 200ms for 90th percentile
- **Context retrieval**: < 300ms for 90th percentile
- **Repository indexing**: Variable based on repository size

### Throughput Limits
- **Concurrent requests**: Up to 10 simultaneous MCP tool calls
- **Search result limits**: Maximum 50 results per query
- **Context size limits**: Maximum 20 related items per request
- **File size limits**: Skip files larger than 1MB by default

### Resource Usage
- **Memory usage**: Target < 500MB for typical repositories
- **Database size**: ~1.5-2x source code size
- **Disk I/O**: Minimize with efficient indexing and caching
- **Network usage**: Only for OpenAI API calls (optional)

## Backwards Compatibility

### API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New optional parameters maintain backwards compatibility
- Deprecated features marked with warnings before removal

### Database Migrations
- Schema changes handled via migration scripts
- Automatic migration on server startup
- Backup creation before major schema changes
- Rollback capability for failed migrations

This API contract ensures consistent, reliable interaction between MCP clients and the Codex server while providing comprehensive code understanding capabilities.