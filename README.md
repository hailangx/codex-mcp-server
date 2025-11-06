# Codex MCP Server

A Model Context Protocol (MCP) server for local repository indexing and code understanding.

## Features

- 🔍 **Semantic Code Search**: Vector-based search across your entire codebase
- 🏗️ **AST Analysis**: Deep code structure understanding using Tree-sitter
- 📊 **Real-time Indexing**: File system monitoring for incremental updates
- 🔗 **Dependency Tracking**: Import/export relationship mapping
- 🎯 **Symbol Resolution**: Find definitions, references, and usages
- 🚀 **VS Code Integration**: Seamless integration with coding agents

## Architecture

```
┌─── MCP Server ───────────────────────────────────────┐
│  ├── Tools (search_code, find_symbol, etc.)         │
│  ├── Database Layer (SQLite + Vector Storage)       │
│  ├── Indexing Engine (AST + Embeddings)             │
│  ├── File System Monitor (Real-time updates)        │
│  └── Language Parsers (TypeScript, Python, etc.)   │
└─────────────────────────────────────────────────────┘
```

**📋 Design Documents**: Before making architectural changes, please review the design documentation in the `design/` folder:
- [System Architecture](./design/system-architecture.md) - Complete system design and component interactions
- [API Contracts](./design/api-contracts.md) - MCP tool specifications and database schema

## Installation

```bash
npm install
npm run build
```

## Development

```bash
npm run dev
```

## Usage

Configure in your MCP client (e.g., VS Code):

```json
{
  "mcpServers": {
    "codex": {
      "command": "node",
      "args": ["path/to/codex-mcp-server/dist/index.js"],
      "env": {
        "REPO_PATH": "/path/to/your/repository"
      }
    }
  }
}
```

## Available Tools

- `search_code` - Semantic search across the codebase
- `find_symbol` - Find function/class definitions
- `get_references` - Find all symbol usages
- `analyze_dependencies` - Show import/dependency graphs
- `get_context` - Get relevant context for code understanding
- `index_repository` - Manually trigger repository indexing

## Configuration

Set environment variables:
- `REPO_PATH` - Path to the repository to index
- `OPENAI_API_KEY` - For embedding generation (optional, can use local embeddings)
- `DB_PATH` - Database storage path (default: ./data)

## 🤖 GitHub Copilot Integration

This project is designed to work seamlessly with GitHub Copilot coding agents. For detailed implementation instructions using GitHub Copilot, see [GITHUB_COPILOT_GUIDE.md](./GITHUB_COPILOT_GUIDE.md).

### Quick Start with GitHub Copilot

1. **Use the hashtag trigger**: Add `#github-pull-request_copilot-coding-agent` to your requests
2. **Provide clear context**: "Implement the DatabaseManager class with SQLite integration for code indexing"
3. **Reference the architecture**: Point to the existing interfaces and types for consistent implementation
4. **Test incrementally**: Build and test each component as you implement it

### Example Copilot Prompts

```
Implement the LanguageParser class that can parse JavaScript and TypeScript files 
to extract function definitions, class declarations, and import statements.
#github-pull-request_copilot-coding-agent
```

```
Create comprehensive unit tests for the SearchEngine class, focusing on semantic 
search functionality and vector similarity calculations.
#github-pull-request_copilot-coding-agent
```

For complete implementation guidance, phase-by-phase instructions, and best practices for using GitHub Copilot with this codebase, see the [GitHub Copilot Guide](./GITHUB_COPILOT_GUIDE.md).

## License

MIT