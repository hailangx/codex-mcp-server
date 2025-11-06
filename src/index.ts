#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { CodeIndexer } from "./indexer/CodeIndexer.js";
import { DatabaseManager } from "./database/DatabaseManager.js";
import { SearchEngine } from "./search/SearchEngine.js";
import { FileWatcher } from "./watcher/FileWatcher.js";
import { Logger } from "./utils/Logger.js";
import * as path from "path";

class CodexMCPServer {
  private server: Server;
  private indexer!: CodeIndexer;
  private database!: DatabaseManager;
  private searchEngine!: SearchEngine;
  private fileWatcher!: FileWatcher;
  private logger: Logger;
  private repoPath: string;

  constructor() {
    this.logger = new Logger("CodexMCPServer");
    this.repoPath = process.env.REPO_PATH || process.cwd();
    this.server = new Server(
      {
        name: "codex-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  async initialize() {
    await this.initializeComponents();
  }

  private async initializeComponents() {
    // Use the repo path as the directory where codex.db will be created
    const dbDir = this.repoPath;
    
    this.database = new DatabaseManager(dbDir);
    await this.database.initialize();

    this.searchEngine = new SearchEngine(this.database);
    this.indexer = new CodeIndexer(this.database, this.searchEngine);
    this.fileWatcher = new FileWatcher(this.repoPath, this.indexer);

    this.logger.info(`Initialized Codex MCP Server for repository: ${this.repoPath}`);
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_code":
            return await this.handleSearchCode(args);
          case "find_symbol":
            return await this.handleFindSymbol(args);
          case "get_references":
            return await this.handleGetReferences(args);
          case "analyze_dependencies":
            return await this.handleAnalyzeDependencies(args);
          case "get_context":
            return await this.handleGetContext(args);
          case "index_repository":
            return await this.handleIndexRepository(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Error handling tool ${name}:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: "search_code",
        description: "Perform semantic search across the codebase",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (natural language or code)",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
              default: 10,
            },
            file_extensions: {
              type: "array",
              items: { type: "string" },
              description: "Filter by file extensions (e.g., ['.ts', '.py'])",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "find_symbol",
        description: "Find symbol definitions (functions, classes, variables)",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Symbol name to find",
            },
            type: {
              type: "string",
              enum: ["function", "class", "variable", "interface", "type"],
              description: "Type of symbol to search for",
            },
          },
          required: ["symbol"],
        },
      },
      {
        name: "get_references",
        description: "Find all references to a symbol",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Symbol name to find references for",
            },
            file_path: {
              type: "string",
              description: "Optional: file path where symbol is defined",
            },
          },
          required: ["symbol"],
        },
      },
      {
        name: "analyze_dependencies",
        description: "Analyze import/export dependencies",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "File path to analyze dependencies for",
            },
            depth: {
              type: "number",
              description: "Depth of dependency analysis (default: 2)",
              default: 2,
            },
          },
          required: ["file_path"],
        },
      },
      {
        name: "get_context",
        description: "Get relevant context for a file or symbol",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "File path to get context for",
            },
            symbol: {
              type: "string",
              description: "Optional: specific symbol to get context for",
            },
            context_size: {
              type: "number",
              description: "Amount of context to return (default: 5)",
              default: 5,
            },
          },
          required: ["file_path"],
        },
      },
      {
        name: "index_repository",
        description: "Manually trigger repository indexing",
        inputSchema: {
          type: "object",
          properties: {
            force: {
              type: "boolean",
              description: "Force re-indexing of all files",
              default: false,
            },
            path: {
              type: "string",
              description: "Specific path to index (default: entire repository)",
            },
          },
        },
      },
    ];
  }

  private async handleSearchCode(args: any) {
    const { query, limit = 10, file_extensions } = args;
    const results = await this.searchEngine.searchCode(query, {
      limit,
      fileExtensions: file_extensions,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleFindSymbol(args: any) {
    const { symbol, type } = args;
    const results = await this.searchEngine.findSymbol(symbol, type);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleGetReferences(args: any) {
    const { symbol, file_path } = args;
    const results = await this.searchEngine.getReferences(symbol, file_path);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleAnalyzeDependencies(args: any) {
    const { file_path, depth = 2 } = args;
    const results = await this.searchEngine.analyzeDependencies(file_path, depth);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleGetContext(args: any) {
    const { file_path, symbol, context_size = 5 } = args;
    const results = await this.searchEngine.getContext(file_path, symbol, context_size);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleIndexRepository(args: any) {
    const { force = false, path: indexPath } = args;
    const targetPath = indexPath ? path.resolve(this.repoPath, indexPath) : this.repoPath;
    
    this.logger.info(`Starting repository indexing: ${targetPath}`);
    await this.indexer.indexRepository(targetPath, force);
    
    return {
      content: [
        {
          type: "text",
          text: `Repository indexing completed for: ${targetPath}`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Start file watcher
    await this.fileWatcher.start();
    
    this.logger.info("Codex MCP Server started successfully");
  }

  async stop() {
    await this.fileWatcher.stop();
    await this.database.close();
    this.logger.info("Codex MCP Server stopped");
  }
}

// Start the server
async function main() {
  const server = new CodexMCPServer();
  
  process.on('SIGINT', async () => {
    console.log('\nShutting down Codex MCP Server...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    console.error('Failed to start Codex MCP Server:', error);
    process.exit(1);
  }
}

// Check if this file is being run directly
// In ES modules, we need to resolve the path properly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main().catch(console.error);
}

export { CodexMCPServer };