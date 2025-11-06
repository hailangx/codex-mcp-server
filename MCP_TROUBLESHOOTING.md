# MCP Server Troubleshooting Guide

## Issue: Cannot see @codex in VS Code Chat

### Step 1: Check VS Code MCP Support

1. **Check VS Code Version**
   - Open VS Code
   - Help → About 
   - You need VS Code 1.90+ for MCP support

2. **Check GitHub Copilot Extension**
   - Extensions panel (Ctrl+Shift+X)
   - Search for "GitHub Copilot"
   - Make sure it's installed and enabled
   - Update to latest version if needed

### Step 2: Verify MCP Server Configuration

Your current settings should have:
```json
{
  "mcp.servers": {
    "codex": {
      "command": "node",
      "args": ["Q:\\src\\Codex\\dist\\index.js"],
      "env": {
        "REPO_PATH": "${workspaceFolder}",
        "DB_PATH": "Q:\\src\\Codex\\codex.db"
      },
      "disabled": false,
      "alwaysAllow": true
    }
  },
  "github.copilot.chat.participants": {
    "codex": {
      "enabled": true
    }
  }
}
```

### Step 3: Check MCP Server Status

1. **Open VS Code Output Panel**
   - Press `Ctrl+Shift+U`
   - Select "MCP" from dropdown
   - Look for server startup logs

2. **Expected Logs:**
   ```
   [INFO] Database opened: Q:\src\Codex\codex.db
   [INFO] Codex MCP Server started successfully
   [INFO] File watcher started successfully
   ```

3. **If No MCP Option:**
   - MCP support might not be enabled
   - Try VS Code Insiders version
   - Or install MCP-specific extensions

### Step 4: Manual Server Test

Test if your server works outside VS Code:

```bash
cd "Q:\src\Codex"
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | node dist/index.js
```

**Expected Response:**
```json
{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"codex-mcp-server","version":"1.0.0"}},"jsonrpc":"2.0","id":1}
```

### Step 5: Common Issues & Solutions

#### Issue A: Path Problems
- Check if file exists: `Q:\src\Codex\dist\index.js`
- Verify Node.js is in PATH
- Use absolute paths in configuration

#### Issue B: VS Code MCP Support
- Try VS Code Insiders (preview version)
- Install "MCP Client" extension from marketplace
- Check if your VS Code build supports MCP

#### Issue C: Server Not Starting
- Check Windows PowerShell execution policy
- Verify Node.js version (18+ required)
- Check file permissions

#### Issue D: Wrong Chat Interface
- Use VS Code Chat panel (Ctrl+Shift+I)
- NOT the GitHub Copilot extension chat
- Look for MCP server in chat participant list

### Step 6: Alternative Access Methods

If direct @codex doesn't work, try:
1. `@mcp codex search_code query="test"`
2. `@github #codex search_code query="test"`
3. Check VS Code Command Palette (`Ctrl+Shift+P`) for MCP commands

### Step 7: Debugging Commands

Run these to gather information:

1. **Check VS Code version:**
   ```
   code --version
   ```

2. **Test server directly:**
   ```bash
   cd "Q:\src\Codex"
   node dist/index.js
   ```

3. **Check if database exists:**
   ```bash
   ls -la codex.db
   ```

### Step 8: If Still Not Working

Try installing an MCP extension:
1. Open Extensions (Ctrl+Shift+X)
2. Search for "MCP Client" or "Copilot MCP"
3. Install and restart VS Code
4. Try again

## Next Steps

Please try the steps above and let me know:
1. What VS Code version you have
2. What you see in the MCP output panel
3. If the manual server test works
4. Any error messages you encounter

This will help identify the exact issue!