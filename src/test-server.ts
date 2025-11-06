#!/usr/bin/env node

// Simple test MCP server to verify VS Code integration works
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

class SimpleTestServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "codex-test-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  private setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "hello",
          description: "Test tool that says hello",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name to greet",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "test_search",
          description: "Test search functionality",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
            },
            required: ["query"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "hello":
          return {
            content: [
              {
                type: "text",
                text: `Hello ${args?.name || "World"}! The Codex MCP server is working! ✅`,
              },
            ],
          };

        case "test_search":
          return {
            content: [
              {
                type: "text",
                text: `Test search for "${args?.query || "test"}" - MCP connection successful! 🔍\n\nThis proves the server can:\n- Receive MCP requests\n- Process tool calls\n- Return structured data\n\nReady for full implementation! 🚀`,
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Codex Test MCP Server running on stdio");
  }
}

// Start the server
const server = new SimpleTestServer();
server.run().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});