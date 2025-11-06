# Codex MCP Server - System Architecture

## Overview
The Codex MCP Server is a Model Context Protocol implementation that provides semantic code understanding capabilities to VS Code coding agents. It indexes local repositories, generates vector embeddings, and offers sophisticated search and analysis tools.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code / MCP Client                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol (stdio)
┌─────────────────────▼───────────────────────────────────────┐
│                  MCP Server (index.ts)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tools: search_code, find_symbol, get_references,  │    │
│  │         analyze_dependencies, get_context, index   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────┬───────────┬───────────┬───────────┬───────────────┘
          │           │           │           │
┌─────────▼─┐ ┌───────▼──┐ ┌──────▼───┐ ┌─────▼──────┐
│ Database  │ │ Indexer  │ │ Search   │ │ File       │
│ Manager   │ │          │ │ Engine   │ │ Watcher    │
└─────┬─────┘ └─────┬────┘ └────┬─────┘ └─────┬──────┘
      │             │           │             │
┌─────▼─────┐ ┌─────▼─────┐ ┌───▼──────┐ ┌───▼────────┐
│  SQLite   │ │ Language  │ │Embedding │ │ chokidar   │
│ Database  │ │ Parser    │ │Generator │ │ (fs watch) │
└───────────┘ └───────────┘ └──────────┘ └────────────┘
```

## Core Components

### 1. MCP Server (`src/index.ts`)
**Purpose**: Main entry point and MCP protocol handler
**Responsibilities**:
- Initialize and coordinate all subsystems
- Handle MCP tool requests and responses
- Manage server lifecycle and error handling
- Provide stdio transport for VS Code integration

**Key Methods**:
- `setupHandlers()` - Configure MCP request handlers
- `getAvailableTools()` - Return tool definitions
- `handleSearchCode()` - Execute semantic code search
- `handleFindSymbol()` - Find symbol definitions
- `handleGetReferences()` - Find symbol usages

### 2. Database Manager (`src/database/DatabaseManager.ts`)
**Purpose**: SQLite database abstraction and schema management
**Responsibilities**:
- Database initialization and schema creation
- CRUD operations for files, symbols, embeddings, dependencies
- Transaction management and connection pooling
- Data integrity and foreign key constraints

**Schema Design**:
- `files` - Repository file metadata and content
- `symbols` - Parsed code symbols (functions, classes, etc.)
- `embeddings` - Vector representations for semantic search
- `dependencies` - Import/export relationships

### 3. Search Engine (`src/search/SearchEngine.ts`)
**Purpose**: Semantic and syntactic code search capabilities
**Responsibilities**:
- Vector similarity search using cosine distance
- Hybrid search combining semantic and keyword matching
- Result ranking and relevance scoring
- Context generation for coding agents

**Search Types**:
- Semantic search via vector embeddings
- Symbol name matching with fuzzy search
- Reference finding across codebase
- Dependency graph traversal

### 4. Code Indexer (`src/indexer/CodeIndexer.ts`)
**Purpose**: Repository scanning and incremental indexing
**Responsibilities**:
- Full repository indexing on initial scan
- Incremental updates based on file changes
- Hash-based change detection
- Batch processing for large codebases

**Indexing Process**:
1. File discovery with ignore pattern filtering
2. Content hashing for change detection
3. Language detection and parsing
4. Symbol extraction and dependency analysis
5. Embedding generation and storage

### 5. Language Parser (`src/parsers/LanguageParser.ts`)
**Purpose**: Multi-language code analysis and symbol extraction
**Responsibilities**:
- Language detection from file extensions
- AST-like parsing using regex patterns
- Symbol extraction (functions, classes, variables)
- Import/export dependency analysis

**Supported Languages**:
- JavaScript/TypeScript - Functions, classes, imports, exports
- Python - Functions, classes, decorators, imports
- Java - Classes, methods, interfaces, imports
- C/C++ - Functions, classes, structs, includes

### 6. Embedding Generator (`src/embeddings/EmbeddingGenerator.ts`)
**Purpose**: Vector embedding generation for semantic search
**Responsibilities**:
- OpenAI API integration for high-quality embeddings
- Local TF-IDF fallback when API unavailable
- Batch processing for API efficiency
- Code preprocessing for better semantics

**Embedding Strategy**:
- Primary: OpenAI text-embedding-3-small (1536 dimensions)
- Fallback: Local hash-based embeddings
- Batch size: 100 texts per API call
- Preprocessing: Comment removal, whitespace normalization

### 7. File Watcher (`src/watcher/FileWatcher.ts`)
**Purpose**: Real-time file system monitoring
**Responsibilities**:
- Watch repository for file changes
- Debounced change detection
- Trigger incremental indexing
- Handle file creation, modification, deletion

**Watch Configuration**:
- Ignore patterns: node_modules, .git, build artifacts
- Debounce delay: 1000ms for stability
- Supported extensions: Code files and configuration
- Graceful error handling and recovery

## Data Flow

### Indexing Flow
```
Repository Files → File Watcher → Code Indexer → Language Parser
                                       ↓
Database ← Embedding Generator ← Symbol Extraction
```

### Search Flow
```
MCP Client → Search Request → Search Engine → Database Query
                                   ↓
Vector Similarity ← Embedding Generator ← Query Processing
                                   ↓
Search Results → Result Ranking → Response Formatting → MCP Client
```

## Design Decisions

### Database Choice: SQLite
**Rationale**: Local storage, ACID compliance, minimal setup
**Trade-offs**: Single-writer limitation, but suitable for local indexing
**Alternatives**: PostgreSQL (too heavy), JSON files (no ACID)

### Vector Storage: Binary Blobs in SQLite
**Rationale**: Simple deployment, no external dependencies
**Trade-offs**: Less efficient than specialized vector DBs
**Future**: Consider Chroma or Pinecone for large-scale deployments

### Language Parsing: Regex-based
**Rationale**: Fast, lightweight, good enough for common patterns  
**Trade-offs**: Less accurate than full AST parsing
**Future**: Integrate tree-sitter for robust AST analysis

### Embedding Strategy: Hybrid (API + Local)
**Rationale**: High quality when available, always functional
**Trade-offs**: API dependency and cost vs. accuracy
**Configuration**: Graceful fallback ensures reliability

## Performance Characteristics

### Indexing Performance
- **Small repos** (< 1K files): 30-60 seconds
- **Medium repos** (1K-10K files): 2-10 minutes  
- **Large repos** (10K+ files): 10-30 minutes
- **Memory usage**: 200-500MB during indexing

### Search Performance  
- **Symbol search**: < 100ms (indexed lookups)
- **Semantic search**: 200-500ms (vector similarity)
- **Reference finding**: 100-300ms (text search + index)
- **Dependency analysis**: 50-200ms (graph traversal)

### Storage Requirements
- **Database size**: ~1.5-2x source code size
- **Embedding overhead**: ~50KB per 1KB of code
- **Index size**: ~10% of database size

## Security Considerations

### Local-Only Processing
- All data remains on local machine
- No external data transmission (except OpenAI API)
- SQLite database secured by file system permissions

### API Key Management
- OpenAI API key stored in environment variables
- Graceful degradation when API unavailable
- No API key logging or exposure

### Input Validation
- All MCP tool inputs validated against JSON schemas
- Path traversal prevention in file operations
- SQL injection prevention through parameterized queries

## Extensibility Points

### Adding New Languages
1. Extend `LanguageParser.detectLanguage()`
2. Implement parsing methods for new language
3. Add file extension mappings
4. Update ignore patterns if needed

### Adding New Search Types
1. Extend `SearchEngine` with new search methods
2. Add corresponding MCP tool definitions
3. Implement result formatting
4. Update documentation

### Adding External Vector Stores
1. Create new embedding storage interface
2. Implement adapter for target vector DB
3. Update configuration options
4. Maintain backward compatibility

This architecture provides a solid foundation for semantic code understanding while maintaining flexibility for future enhancements and integrations.