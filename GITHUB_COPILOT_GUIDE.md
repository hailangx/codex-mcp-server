# GitHub Copilot Coding Agent Implementation Guide

This document provides step-by-step instructions for implementing the Codex MCP Server using GitHub Copilot coding agent capabilities.

## 🚀 Implementation Strategy

### Phase 1: Project Setup and Core Infrastructure
**Priority: High | Estimated Time: 2-3 hours**

#### 1.1 Initialize Project Structure
```bash
# Create the project structure
mkdir -p src/{database,indexer,search,parsers,embeddings,watcher,utils,__tests__}
npm init -y
```

#### 1.2 Install Dependencies
```bash
# Core dependencies
npm install @modelcontextprotocol/sdk sqlite3 chokidar openai tree-sitter
npm install tree-sitter-typescript tree-sitter-python tree-sitter-javascript
npm install ignore mime-types fast-glob xxhash-wasm

# Development dependencies  
npm install -D typescript tsx jest @types/jest @types/node @types/sqlite3
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier
```

#### 1.3 Configure TypeScript and Build Tools
- Set up `tsconfig.json` with proper Node.js types
- Configure ESLint and Prettier
- Set up Jest for testing
- Create build and dev scripts in package.json

### Phase 2: Database Layer Implementation
**Priority: High | Estimated Time: 3-4 hours**

#### 2.1 Database Schema Design
Implement `DatabaseManager.ts` with tables for:
- `files` - Store file metadata and content
- `symbols` - Store parsed code symbols (functions, classes, etc.)
- `embeddings` - Store vector embeddings for semantic search
- `dependencies` - Store import/export relationships

#### 2.2 Key Database Operations
- File CRUD operations with hash-based change detection
- Symbol insertion and retrieval with file associations
- Embedding storage with binary blob handling
- Dependency mapping with external/internal classification

#### 2.3 Database Optimization
- Create indexes for fast symbol and file lookups
- Implement proper foreign key relationships
- Add batch operations for bulk insertions
- Handle database migrations and schema updates

### Phase 3: Language Parsing Engine
**Priority: High | Estimated Time: 4-5 hours**

#### 3.1 Language Detection
Implement `LanguageParser.ts` with:
- File extension to language mapping
- Support for JavaScript/TypeScript, Python, Java, C/C++
- Extensible architecture for adding new languages

#### 3.2 Symbol Extraction
For each supported language, implement:
- Function/method parsing with signatures
- Class and interface extraction
- Variable and constant identification
- Docstring and comment extraction
- Modifier and annotation parsing

#### 3.3 Dependency Analysis
Parse and extract:
- Import/export statements
- Module dependencies
- External vs internal dependency classification
- Symbol-level import mapping

### Phase 4: Embedding and Search Engine
**Priority: Medium | Estimated Time: 3-4 hours**

#### 4.1 Embedding Generation
Implement `EmbeddingGenerator.ts` with:
- OpenAI API integration for high-quality embeddings
- Local fallback using TF-IDF-like approach
- Batch processing for efficient API usage
- Code preprocessing for better semantic understanding

#### 4.2 Search Engine Implementation
Create `SearchEngine.ts` with:
- Vector similarity search using cosine similarity
- Hybrid search combining semantic and keyword matching
- Result ranking and relevance scoring
- Search result formatting and snippet generation

#### 4.3 Advanced Search Features
- Symbol-based search with type filtering
- Reference finding across the entire codebase
- Dependency graph traversal and analysis
- Context-aware code suggestions

### Phase 5: File System Monitoring
**Priority: Medium | Estimated Time: 2-3 hours**

#### 5.1 File Watcher Setup
Implement `FileWatcher.ts` with:
- Chokidar-based file system monitoring
- Ignore patterns for node_modules, .git, etc.
- Debounced change detection to avoid rapid re-indexing
- Error handling and recovery mechanisms

#### 5.2 Incremental Indexing
- Hash-based change detection to skip unchanged files
- Incremental symbol and embedding updates
- Dependency graph updates on file changes
- Cleanup of orphaned database records

### Phase 6: MCP Server Integration
**Priority: High | Estimated Time: 2-3 hours**

#### 6.1 MCP Tools Implementation
Create tools in `index.ts`:
- `search_code` - Semantic code search
- `find_symbol` - Symbol definition lookup
- `get_references` - Find all symbol usages
- `analyze_dependencies` - Dependency graph analysis
- `get_context` - Contextual code understanding
- `index_repository` - Manual indexing trigger

#### 6.2 Server Configuration
- Stdio transport setup for MCP communication
- Request/response handling with proper error management
- Tool schema definitions with input validation
- Logging and monitoring integration

### Phase 7: Testing and Quality Assurance
**Priority: Medium | Estimated Time: 3-4 hours**

#### 7.1 Unit Testing
Create comprehensive tests for:
- Database operations and schema
- Language parsing accuracy
- Embedding generation and similarity
- Search engine functionality
- File watching and incremental updates

#### 7.2 Integration Testing
- End-to-end indexing workflows
- MCP tool functionality
- Error handling and edge cases
- Performance testing with large codebases

#### 7.3 Code Quality
- ESLint configuration for consistent code style
- Prettier formatting rules
- TypeScript strict mode compliance
- Code coverage reporting

### Phase 8: Deployment and Documentation
**Priority: Low | Estimated Time: 2-3 hours**

#### 8.1 Deployment Scripts
- Installation scripts for Windows and Unix
- Environment configuration templates
- MCP client configuration examples
- Docker containerization (optional)

#### 8.2 Documentation
- Comprehensive README with setup instructions
- API documentation for MCP tools
- Architecture diagrams and design decisions
- Troubleshooting guide and FAQ

## 🛠️ Implementation Tips for GitHub Copilot

### Workflow Requirements (Following Copilot Instructions)

**CRITICAL**: This project follows specific GitHub Copilot Instructions. Before implementation:

1. **Review Design Documents**: Always check `design/` folder before making architectural changes
   - [System Architecture](./design/system-architecture.md) - Component interactions and design decisions  
   - [API Contracts](./design/api-contracts.md) - MCP tools and database schema

2. **Use Changelog as Planning Tool**: 
   - Create detailed changelog entry at START of work (in `changelog/` folder)
   - List complete plan with all steps and components to change
   - Update incrementally as work progresses
   - Mark steps as "Not Started", "In Progress", "Completed"

3. **Git Workflow**: 
   - **Always create feature branch** from `main` before making changes
   - Branch naming: `feature/<short-description>` or `fix/<short-description>`
   - **Do NOT merge to main** unless explicitly requested
   - Work exclusively in feature branch

4. **Testing Protocol**:
   - Run unit tests first, then integration tests
   - Document test results with passed/failed/skipped counts
   - Note any skipped tests and explain why

### Code Generation Strategies
1. **Start with interfaces and types** - Define clear TypeScript interfaces first
2. **Use descriptive function names** - This helps Copilot understand intent
3. **Write comprehensive comments** - Explain complex algorithms and business logic
4. **Follow consistent patterns** - Establish patterns early for better suggestions

### Prompting Best Practices
```typescript
// Good prompt structure:
// TODO: Implement SQLite database manager for code indexing
// Should handle file records with hash-based change detection
// Include methods for CRUD operations on files, symbols, embeddings
class DatabaseManager {
  // Copilot will generate appropriate implementation
}
```

### Testing Strategy
```typescript
// Write test descriptions first to guide implementation
describe('DatabaseManager', () => {
  it('should store and retrieve file records with metadata', async () => {
    // Test implementation guides the actual code structure
  });
  
  it('should detect file changes using content hashes', async () => {
    // This helps Copilot understand the change detection requirement
  });
});
```

### Error Handling Patterns
```typescript
// Establish consistent error handling patterns
try {
  const result = await this.database.insertFile(fileRecord);
  this.logger.info(`Successfully indexed: ${filePath}`);
  return result;
} catch (error) {
  this.logger.error(`Failed to index file ${filePath}:`, error);
  throw new IndexingError(`File indexing failed: ${error.message}`);
}
```

## 🎯 Success Criteria

### Functional Requirements
- [x] Index repositories with 10,000+ files efficiently
- [x] Provide sub-second search response times
- [x] Support real-time file change monitoring
- [x] Generate semantic embeddings for accurate search
- [x] Parse symbols from multiple programming languages
- [x] Integrate seamlessly with VS Code via MCP

### Performance Requirements
- Index 1,000 files in under 2 minutes
- Search queries return results in <500ms
- Memory usage stays under 500MB for typical repositories
- Database size remains reasonable (< 2x source code size)

### Quality Requirements
- 95%+ test coverage for core functionality
- TypeScript strict mode compliance
- Zero critical security vulnerabilities
- Comprehensive error handling and logging

## 🔧 Troubleshooting Common Issues

### Database Issues
- **SQLite lock errors**: Implement proper connection pooling
- **Large file handling**: Add file size limits and chunking
- **Schema migrations**: Version database schema properly

### Performance Issues
- **Slow indexing**: Implement parallel processing and batching
- **Memory leaks**: Use streaming for large files
- **Search timeouts**: Add query optimization and caching

### MCP Integration Issues
- **Connection problems**: Verify stdio transport configuration
- **Tool errors**: Add comprehensive input validation
- **Client compatibility**: Test with multiple MCP clients

## 📈 Future Enhancements

### Advanced Features
- **Code similarity detection** for duplicate code identification
- **Refactoring suggestions** based on code patterns
- **Documentation generation** from code structure
- **Code quality metrics** and technical debt analysis

### Language Support
- **Additional languages**: Go, Rust, Swift, Kotlin
- **Framework-specific parsing**: React, Vue, Django
- **Configuration files**: YAML, JSON, TOML parsing
- **Documentation formats**: Markdown, reStructuredText

### Integration Capabilities
- **Git integration** for change tracking and blame information
- **CI/CD integration** for automated indexing
- **Team features** for shared code understanding
- **API endpoints** for external tool integration

## 📋 Workflow Requirements (GitHub Copilot Instructions Compliance)

### CRITICAL: Before Starting Any Implementation

1. **Review Design Documents**: 
   - Read `design/system-architecture.md` for component understanding
   - Check `design/api-contracts.md` for API specifications
   - Update design docs if architectural changes are needed

2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/implement-mcp-server
   # or
   git checkout -b fix/database-connection-issues
   ```

3. **Create Planning Changelog** (Required):
   - Create `changelog/YYYY-MM-DD-HHmm-implementation-plan.md`
   - Document complete implementation plan with status tracking
   - Update incrementally as work progresses

### During Implementation

4. **Incremental Changelog Updates**:
   - Mark steps as "In Progress" when starting
   - Mark "Completed" immediately when done
   - Add technical decisions and issues encountered
   - Document test results (X passing ✅, X skipped ⏭️, X failed ❌)

5. **Testing Protocol**:
   - Run unit tests after each component
   - Run integration tests on simulator/environment
   - Document all test results with counts
   - Explain any skipped tests

6. **Code Quality**:
   - Follow TypeScript strict mode
   - Maintain existing patterns and architecture
   - Add comprehensive error handling
   - Keep commits atomic and focused

### Session Completion

7. **Final Changelog Entry**:
   - Refine planning changelog to coherent final version  
   - Add entry to `changelog/CHANGELOG.md` with 3-5 bullet points
   - Include final test results summary
   - Document any incomplete work or next steps

8. **Branch Management**:
   - **Do NOT merge to main** unless explicitly requested
   - Keep all work in feature branch
   - Push branch for review/collaboration

### Example Session Documentation

```markdown
## Session: 2025-11-05 - Database Layer Implementation

### Summary
Successfully implemented SQLite database layer with full CRUD operations,
proper schema design, and comprehensive error handling.

### Changes Made  
- Created DatabaseManager class with connection pooling
- Implemented all table schemas (files, symbols, embeddings, dependencies)
- Added hash-based change detection for incremental updates
- Built comprehensive test suite with 95% coverage

### Test Results
- 24 tests passed ✅
- 2 tests skipped (require live database) ⏭️  
- 0 tests failed ❌

### Next Steps
- Implement LanguageParser for symbol extraction
- Add embedding generation capabilities
- Create real-time file monitoring system
```

**Remember**: Documentation is as important as code. Always leave a clear trail of what was done and why.

---

This implementation guide provides a structured approach to building the Codex MCP Server with GitHub Copilot assistance. Follow the phases sequentially for best results, use the prompting strategies to get the most out of AI-assisted development, and **always follow the workflow requirements** for consistent, trackable progress.