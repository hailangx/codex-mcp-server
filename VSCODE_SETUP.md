# VS Code MCP Integration Setup Guide

## Prerequisites

1. **VS Code**: Latest version with MCP support
2. **Node.js**: Version 18+ installed
3. **Build completed**: Run `npm run build` in the Codex directory

## Step 1: Configure VS Code Settings

Add the following to your VS Code `settings.json` (File → Preferences → Settings → Open Settings JSON):

```json
{
  "mcp.servers": {
    "codex": {
      "command": "node",
      "args": ["Q:/src/Codex/dist/test-server.js"],
      "env": {
        "REPO_PATH": "${workspaceFolder}"
      }
    }
  }
}
```

**Important:** Replace `Q:/src/Codex/dist/test-server.js` with the absolute path to your compiled server.

## Step 2: Verify MCP Connection

1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run: `MCP: Restart Servers` (if available)
3. Check VS Code's Output panel for MCP logs

## Step 3: Test MCP Tools

Once connected, you should be able to use these tools in VS Code chat:

### Hello Tool
```
@mcp hello name="Developer"
```
Expected response: "Hello Developer! The Codex MCP server is working! ✅"

### Test Search Tool
```
@mcp test_search query="typescript function"
```
Expected response: Search confirmation with connection status.

## Step 4: Full Server Integration

After testing works, switch to the full server by updating settings.json:

```json
{
  "mcp.servers": {
    "codex": {
      "command": "node",
      "args": ["Q:/src/Codex/dist/index.js"],
      "env": {
        "REPO_PATH": "${workspaceFolder}"
      }
    }
  }
}
```

## Available Tools (Full Server)

1. **search_code**: Search for code patterns and functions
2. **find_symbol**: Find specific symbols (classes, functions, variables)
3. **get_references**: Find all references to a symbol
4. **analyze_dependencies**: Analyze file dependencies
5. **get_context**: Get context around a file or symbol
6. **index_repository**: Index a repository for searching

## Troubleshooting

### MCP Server Not Found
- Verify the absolute path in settings.json
- Ensure the server is built: `npm run build`
- Check VS Code's Output panel for error messages

### No MCP Support in VS Code
- Ensure you have the latest VS Code version
- Check if MCP extension is installed and enabled

### Server Startup Errors
- Check terminal output: `node dist/test-server.js`
- Verify Node.js version: `node --version` (should be 18+)
- Check for missing dependencies: `npm install`

### Performance Issues
- Monitor server memory usage
- Check file watch limits on your system
- Consider excluding large directories (node_modules, .git)

## Example Usage in VS Code Chat

```
# Search for database functions
@mcp search_code query="database insert"

# Find a specific class
@mcp find_symbol symbol="DatabaseManager"

# Get context for a file
@mcp get_context file_path="src/index.ts"

# Analyze dependencies
@mcp analyze_dependencies file_path="src/database/DatabaseManager.ts"
```

## Configuration Options

### Environment Variables
- `REPO_PATH`: Path to repository to index (defaults to current working directory)
- `OPENAI_API_KEY`: For enhanced embedding generation (optional)
- `LOG_LEVEL`: Set to "debug" for verbose logging

### Server Settings (in settings.json)
```json
{
  "mcp.servers": {
    "codex": {
      "command": "node",
      "args": ["path/to/dist/index.js"],
      "env": {
        "REPO_PATH": "${workspaceFolder}",
        "LOG_LEVEL": "info",
        "OPENAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Development Mode

For development, use the watch mode:
```json
{
  "command": "npm",
  "args": ["run", "dev"],
  "cwd": "Q:/src/Codex"
}
```

This will automatically rebuild and restart the server when files change.

---

## Quick Start Commands

1. Build: `npm run build`
2. Test: `node dist/test-server.js`
3. Add to VS Code settings
4. Restart VS Code
5. Test with: `@mcp hello name="Test"`

Success! Your MCP server is now integrated with VS Code! 🎉