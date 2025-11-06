# MCP Integration Test Guide

## Testing Your MCP Server in VS Code

### Prerequisites Check
1. ✅ MCP server is built and ready
2. ✅ Configuration added to VS Code settings
3. ✅ VS Code has been restarted
4. ❓ VS Code has MCP extension/support

### How to Test MCP Commands


#### Option 1: VS Code Chat Interface
1. Open VS Code Chat:
   - Press `Ctrl+Shift+I`
   - Or click the chat icon in sidebar
   - Or Command Palette → "GitHub Copilot: Open Chat"

2. Try these commands in the chat:
   ```
   @mcp hello name="Developer"
   @mcp test_search query="typescript"
   ```

#### Option 2: Command Palette
1. Press `Ctrl+Shift+P`
2. Look for MCP-related commands
3. Try "MCP: List Servers" or similar

### Expected Results
- **Working**: You get responses from the MCP tools
- **Not Working**: Commands are not recognized or no response

### If MCP Commands Don't Work

#### Check 1: MCP Extension
VS Code might need a specific MCP extension. Check:
- Extensions panel (`Ctrl+Shift+X`)
- Search for "MCP" or "Model Context Protocol"
- Install if available

#### Check 2: VS Code Version
- MCP support might require VS Code Insiders
- Or specific version with MCP support
- Check Help → About

#### Check 3: Settings Verification
Your current settings in `settings.json`:
```json
{
  "mcp.servers": {
    "codex": {
      "command": "node",
      "args": ["Q:\\src\\Codex\\dist\\test-server.js"],
      "env": {
        "REPO_PATH": "${workspaceFolder}"
      }
    }
  }
}
```

#### Check 4: VS Code Output Panel
1. Open Output panel (`Ctrl+Shift+U`)
2. Select "MCP" from dropdown
3. Look for connection errors or logs

### Alternative Testing Method
If VS Code MCP integration isn't working, we can test the server directly:

```bash
# Test server manually
cd "Q:\src\Codex"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "hello", "arguments": {"name": "Developer"}}}' | node dist/test-server.js
```

This should return:
```json
{"result":{"content":[{"type":"text","text":"Hello Developer! The Codex MCP server is working! ✅"}]},"jsonrpc":"2.0","id":1}
```

### Next Steps Based on Results

#### If MCP Commands Work in VS Code ✅
- Test both tools (hello and test_search)
- Switch to full server (change settings to use `index.js`)
- Test advanced features

#### If MCP Commands Don't Work ❌
- Check VS Code version and MCP support
- Look for MCP extension in marketplace
- Verify settings are correct
- Check VS Code output panel for errors

### Need Help?
Let me know what happens when you try the `@mcp` commands in VS Code chat, and I can help troubleshoot further!