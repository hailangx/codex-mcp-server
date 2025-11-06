# VS Code MCP Integration Test

## Current Configuration ✅

Your VS Code is configured with the Codex MCP server:

```json
{
  "mcp.servers": {
    "codex": {
      "command": "node",
      "args": ["Q:\\src\\Codex\\dist\\index.js"],
      "env": {
        "REPO_PATH": "${workspaceFolder}",
        "DB_PATH": "Q:\\src\\Codex\\codex.db"
      }
    }
  }
}
```

## Testing Steps

### 1. Restart VS Code
- Completely close VS Code
- Reopen VS Code
- Open this Codex project

### 2. Test MCP Commands in Chat Panel

Open VS Code Chat (`Ctrl+Shift+I`) and try:

**Basic Search:**
```
@mcp search_code query="database manager"
```

**Find Symbols:**
```
@mcp find_symbol symbol="DatabaseManager"
```

**Index Repository:**
```
@mcp index_repository force=true
```

**Get Context:**
```
@mcp get_context file_path="src/index.ts"
```

### 3. Troubleshooting

If `@mcp` commands don't work:

#### Check VS Code Output Panel
1. Open Output panel (`Ctrl+Shift+U`)
2. Select "MCP" from the dropdown
3. Look for connection errors or logs

#### Expected Output
You should see logs like:
```
[INFO] Database opened: Q:\src\Codex\codex.db  
[INFO] Codex MCP Server started successfully
[INFO] File watcher started successfully
```

#### If No MCP Option in Output
- VS Code might not have MCP support enabled
- Try installing "GitHub Copilot Chat" extension
- Check if you have the latest VS Code version

### 4. Manual Server Test

If VS Code integration doesn't work, test the server manually:

```bash
cd "Q:\src\Codex"
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | node dist/index.js
```

Expected response:
```json
{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"codex-mcp-server","version":"1.0.0"}},"jsonrpc":"2.0","id":1}
```

## Available MCP Tools

Once working, you'll have access to:

- **`search_code`** - Semantic search across codebase
- **`find_symbol`** - Find function/class definitions  
- **`get_references`** - Find all symbol references
- **`analyze_dependencies`** - Import/export analysis
- **`get_context`** - Get relevant file context
- **`index_repository`** - Trigger manual indexing

## Success Indicators ✅

- Chat commands with `@mcp` work
- Server responds with code search results
- MCP logs appear in VS Code Output panel
- Database grows as repository is indexed

## Next Steps

1. Test the basic commands above
2. If working: Use for code exploration and analysis
3. If not working: Check troubleshooting steps
4. Report results for further debugging