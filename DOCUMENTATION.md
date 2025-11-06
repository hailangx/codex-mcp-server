# Codex MCP Server Documentation

## Overview

Codex is a Model Context Protocol (MCP) server designed to provide local repository indexing and code understanding capabilities for AI coding agents, particularly VS Code Copilot. It creates a searchable index of your codebase using vector embeddings and traditional search techniques.

## Architecture

```
┌─── Codex MCP Server ─────────────────────────────────────┐
│                                                          │
│  ┌─── MCP Interface ────────────────────────────────┐   │
│  │  • search_code         • get_references          │   │
│  │  • find_symbol         • analyze_dependencies    │   │
│  │  • get_context         • index_repository        │   │
│  └──────────────────────────────────────────────────┘   │
│                                   │                      │
│  ┌─── Core Components ──────────────────────────────┐   │
│  │                                                  │   │
│  │  ┌─── Database Layer ─────────────────────────┐  │   │
│  │  │  • SQLite (Files, Symbols, Dependencies)   │  │   │
│  │  │  • Vector Storage (Embeddings)             │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌─── Indexing Engine ────────────────────────┐  │   │
│  │  │  • File System Monitor (Chokidar)          │  │   │
│  │  │  • Language Parsers (AST Analysis)         │  │   │
│  │  │  • Embedding Generator (OpenAI/Local)      │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌─── Search Engine ──────────────────────────┐  │   │
│  │  │  • Semantic Search (Vector Similarity)     │  │   │
│  │  │  • Symbol Resolution                       │  │   │
│  │  │  • Dependency Analysis                     │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Features

### 🔍 **Semantic Code Search**
- Vector-based search across your entire codebase
- Understands code semantics, not just text matching
- Finds relevant code even with different variable names or implementations

### 🏗️ **AST Analysis**
- Deep code structure understanding using language-specific parsers
- Extracts functions, classes, variables, interfaces, and types
- Supports multiple programming languages

### 📊 **Real-time Indexing**
- File system monitoring for incremental updates
- Automatically re-indexes changed files
- Efficient handling of large repositories

### 🔗 **Dependency Tracking**
- Maps import/export relationships
- Tracks internal and external dependencies
- Analyzes dependency graphs

### 🎯 **Symbol Resolution**
- Find definitions, references, and usages
- Cross-file symbol navigation
- Understand code relationships

### 🚀 **VS Code Integration**
- Seamless integration with coding agents
- MCP protocol for standardized communication
- Enhances AI understanding of your codebase

## Supported Languages

### Primary Support (Full AST parsing)
- **JavaScript/TypeScript** - Functions, classes, interfaces, types, imports
- **Python** - Functions, classes, methods, imports, docstrings
- **Java** - Classes, methods, interfaces, imports
- **C/C++** - Functions, classes, structs, includes

### Secondary Support (Basic parsing)
- C#, PHP, Ruby, Go, Rust, Swift, Kotlin, Scala, Clojure
- Configuration files: JSON, YAML, XML
- Documentation: Markdown, HTML, CSS

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Quick Install

```bash
# Clone or download the project
git clone <repository-url>
cd codex-mcp-server

# Run installation script
chmod +x install.sh
./install.sh

# Or on Windows
install.bat
```

### Manual Install

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Create configuration
cp .env.example .env
cp mcp-config.example.json mcp-config.json

# Edit configuration files
```

## Configuration

### Environment Variables (.env)

```bash
# Path to the repository to index (required)
REPO_PATH=/path/to/your/repository

# Database storage path (optional)
DB_PATH=./data

# OpenAI API key for embeddings (optional)
OPENAI_API_KEY=your-openai-api-key-here

# Log level (DEBUG, INFO, WARN, ERROR)
LOG_LEVEL=INFO

# Node environment
NODE_ENV=production
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., VS Code settings):

```json
{
  "mcpServers": {
    "codex": {
      "command": "node",
      "args": ["path/to/codex-mcp-server/dist/index.js"],
      "env": {
        "REPO_PATH": "/path/to/your/repository",
        "OPENAI_API_KEY": "your-openai-api-key-here"
      }
    }
  }
}
```

## Usage

### Starting the Server

```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev

# With custom repository path
REPO_PATH=/path/to/repo npm start

# Using the launcher script
node start.js --repo=/path/to/repo
```

### Available MCP Tools

#### `search_code`
Perform semantic search across the codebase.

```json
{
  "name": "search_code",
  "arguments": {
    "query": "function that calculates fibonacci numbers",
    "limit": 10,
    "file_extensions": [".js", ".ts"]
  }
}
```

#### `find_symbol`
Find symbol definitions (functions, classes, variables).

```json
{
  "name": "find_symbol",
  "arguments": {
    "symbol": "calculateFibonacci",
    "type": "function"
  }
}
```

#### `get_references`
Find all references to a symbol.

```json
{
  "name": "get_references",
  "arguments": {
    "symbol": "UserModel",
    "file_path": "src/models/User.js"
  }
}
```

#### `analyze_dependencies`
Analyze import/export dependencies.

```json
{
  "name": "analyze_dependencies",
  "arguments": {
    "file_path": "src/components/Header.jsx",
    "depth": 2
  }
}
```

#### `get_context`
Get relevant context for a file or symbol.

```json
{
  "name": "get_context",
  "arguments": {
    "file_path": "src/utils/api.js",
    "symbol": "fetchUserData",
    "context_size": 5
  }
}
```

#### `index_repository`
Manually trigger repository indexing.

```json
{
  "name": "index_repository",
  "arguments": {
    "force": true,
    "path": "src/specific/directory"
  }
}
```

## Performance Considerations

### Large Repositories
- Indexing is performed incrementally
- Only changed files are re-processed
- Database uses efficient indexing strategies
- Memory usage scales with repository size

### Embedding Generation
- **With OpenAI API**: Fast, high-quality embeddings
- **Local embeddings**: Slower but privacy-focused
- Batch processing for efficiency
- Caching to avoid re-computation

### File System Monitoring
- Uses efficient file watching (chokidar)
- Ignores common non-code directories
- Configurable ignore patterns
- Minimal resource usage when idle

## Database Schema

### Files Table
- `id`, `path`, `content`, `hash`, `size`, `language`
- `last_modified`, `indexed_at`

### Symbols Table
- `id`, `file_id`, `name`, `type`, `start_line`, `end_line`
- `start_column`, `end_column`, `definition`, `docstring`, `modifiers`

### Embeddings Table
- `id`, `file_id`, `symbol_id`, `chunk_index`
- `content`, `embedding`, `metadata`

### Dependencies Table
- `id`, `source_file_id`, `target_file_id`, `import_path`
- `import_type`, `is_external`, `symbols`

## Troubleshooting

### Common Issues

#### Server Won't Start
- Check Node.js version (18+ required)
- Verify repository path exists and is readable
- Check for port conflicts

#### Slow Indexing
- Large files (>1MB) are skipped by default
- Adjust ignore patterns to exclude unnecessary files
- Consider using OpenAI API for faster embeddings

#### Search Results Poor Quality
- Ensure files are properly indexed
- Check language support for your file types
- Verify embedding generation is working

#### High Memory Usage
- Reduce chunk size in embedding generation
- Limit concurrent file processing
- Consider excluding large binary files

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=DEBUG npm start

# Run with Node.js debugging
node --inspect dist/index.js
```

### Logs Location
- Console output by default
- Configure log files in Logger class
- Structured JSON logging available

## Development

### Project Structure

```
src/
├── index.ts                 # Main MCP server entry point
├── database/
│   └── DatabaseManager.ts   # SQLite database management
├── indexer/
│   └── CodeIndexer.ts       # File indexing logic
├── search/
│   └── SearchEngine.ts      # Search and query processing
├── parsers/
│   └── LanguageParser.ts    # AST parsing for different languages
├── embeddings/
│   └── EmbeddingGenerator.ts # Vector embedding generation
├── watcher/
│   └── FileWatcher.ts       # File system monitoring
├── utils/
│   └── Logger.ts            # Logging utilities
└── __tests__/
    ├── setup.ts             # Test configuration
    └── integration.test.ts  # Integration tests
```

### Building

```bash
# Development build
npm run build

# Watch mode
npm run dev

# Type checking
npx tsc --noEmit
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test -- --coverage

# Run specific test
npm test -- --testNamePattern="DatabaseManager"
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## API Reference

### DatabaseManager Class
- `initialize()` - Set up database tables
- `insertFile(file)` - Add/update file record
- `getFile(path)` - Retrieve file by path
- `insertSymbol(symbol)` - Add symbol record
- `findSymbolsByName(name, type?)` - Search symbols

### CodeIndexer Class
- `indexRepository(path, force?)` - Index entire repository
- `indexFile(filePath, repoPath)` - Index single file
- `updateFile(filePath, repoPath)` - Update existing file
- `removeFile(filePath, repoPath)` - Remove file from index

### SearchEngine Class
- `searchCode(query, options)` - Semantic code search
- `findSymbol(name, type?)` - Find symbol definitions
- `getReferences(symbol, filePath?)` - Find symbol references
- `analyzeDependencies(filePath, depth)` - Dependency analysis

### EmbeddingGenerator Class
- `generateEmbedding(text)` - Create vector embedding
- `generateBatchEmbeddings(texts)` - Batch processing
- `cosineSimilarity(a, b)` - Calculate similarity

## Roadmap

### Planned Features
- [ ] Web interface for repository exploration
- [ ] Plugin system for custom parsers
- [ ] Multi-repository support
- [ ] Code similarity detection
- [ ] Integration with more IDEs
- [ ] Cloud deployment options

### Performance Improvements
- [ ] Distributed indexing for very large repos
- [ ] More efficient vector storage
- [ ] Incremental embedding updates
- [ ] Query result caching

## License

MIT License - see LICENSE file for details.

## Support

- Issues: Create GitHub issues for bugs and feature requests
- Discussions: Use GitHub discussions for questions
- Documentation: Check this README and inline code documentation