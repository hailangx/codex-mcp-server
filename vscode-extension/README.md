# Codex MCP Client Extension

A VS Code extension that provides direct integration with the Codex Model Context Protocol (MCP) server for enhanced code analysis, search, and understanding capabilities.

## Features

- **Direct MCP Integration**: Communicates directly with your Codex MCP server without external dependencies
- **Code Search**: Semantic search across your codebase using natural language queries
- **Symbol Finding**: Locate classes, functions, variables, and other code symbols quickly
- **Interactive Panel**: Dedicated webview panel for MCP server interaction
- **Status Monitoring**: Real-time connection status with the MCP server
- **Command Palette Integration**: Access all features through VS Code's command palette
- **Context Menu Integration**: Right-click on selected code for instant analysis

## Installation

1. **Development Mode**: Launch the extension in VS Code Extension Development Host
2. **Built Extension**: Package and install the .vsix file
3. **Local Development**: Clone and build from source

## Configuration

The extension can be configured through VS Code settings:

```json
{
  "codex.serverPath": "Q:\\src\\Codex\\dist\\test-server.js",
  "codex.nodeCommand": "node",
  "codex.autoStart": true
}
```

### Settings

- **`codex.serverPath`**: Full path to your Codex MCP server executable
- **`codex.nodeCommand`**: Node.js command to run the server (default: "node")
- **`codex.autoStart`**: Automatically start the MCP server when VS Code opens (default: true)

## Available Commands

Access these commands through the Command Palette (`Ctrl+Shift+P`):

### Core Commands

- **`Codex: Test Connection`** - Verify MCP server connectivity
- **`Codex: Search Code`** - Search your codebase with natural language
- **`Codex: Find Symbol`** - Locate specific code symbols
- **`Codex: Open Panel`** - Open the interactive Codex panel
- **`Codex: Index Repository`** - Index repository (requires full server)

### Context Menu Commands

Right-click on selected code in the editor:

- **`Codex: Search Code`** - Search for the selected text
- **`Codex: Find Symbol`** - Find references to the selected symbol

## Usage

### 1. Basic Connection Test

```
Ctrl+Shift+P → "Codex: Test Connection"
```

This will:
- Start the MCP server if not running
- Send a hello message to verify connectivity
- Display connection status

### 2. Code Search

```
Ctrl+Shift+P → "Codex: Search Code"
```

Enter natural language queries like:
- "database connection functions"
- "error handling in TypeScript"
- "authentication middleware"

### 3. Symbol Finding

```
Ctrl+Shift+P → "Codex: Find Symbol"
```

Or select text in editor and right-click → "Codex: Find Symbol"

### 4. Interactive Panel

```
Ctrl+Shift+P → "Codex: Open Panel"
```

The panel provides:
- Real-time connection status
- Direct tool testing interface
- Available tools listing
- Search functionality with results display

## Architecture

### MCP Client (`mcpClient.ts`)

- Spawns and manages the Codex MCP server process
- Handles JSON-RPC 2.0 communication over stdio
- Manages request/response lifecycle with timeout handling
- Provides event-based status updates

### Extension Main (`extension.ts`)

- Registers all VS Code commands and menu items
- Manages extension lifecycle and configuration
- Creates and handles webview panels
- Provides status bar integration

### Key Features

#### Automatic Server Management
- Starts MCP server on demand
- Monitors connection health
- Handles server restarts and errors
- Displays connection status in status bar

#### Robust Communication
- JSON-RPC 2.0 protocol compliance
- Request timeout handling (30 seconds)
- Error propagation and logging
- Output channel for debugging

#### VS Code Integration
- Command palette commands
- Context menu integration
- Status bar indicators
- Webview panels for rich UI
- Configuration through VS Code settings

## Development

### Building

```bash
npm run compile        # Build once
npm run watch         # Build and watch for changes
npm run package       # Build for production
```

### Testing

```bash
npm test              # Run tests
F5                    # Launch Extension Development Host
```

### Debugging

- Use VS Code's built-in debugger with the provided launch configuration
- Check the "Codex MCP Client" output channel for server communication
- Monitor the "Codex MCP" output channel for extension logs

### Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts      # Main extension logic
│   ├── mcpClient.ts      # MCP protocol client
│   └── test/            # Test files
├── .vscode/
│   ├── launch.json      # Debug configuration
│   └── tasks.json       # Build tasks
├── package.json         # Extension manifest
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Server Compatibility

### Test Server (Current)
- `hello` - Connection testing
- `test_search` - Basic search functionality

### Full Server (Future)
- `search_code` - Semantic code search
- `find_symbol` - Symbol location and references
- `analyze_dependencies` - Dependency graph analysis
- `get_context` - Contextual code information
- `index_repository` - Full repository indexing

## Troubleshooting

### Server Won't Start
1. Verify `codex.serverPath` points to correct server file
2. Ensure Node.js is installed and accessible
3. Check server file exists and is executable
4. Review "Codex MCP Client" output channel for errors

### Connection Issues
1. Restart VS Code
2. Check if server process is running in Task Manager
3. Verify no port conflicts
4. Try manual server start in terminal

### Commands Not Working
1. Ensure extension is activated (check status bar)
2. Verify MCP server is connected (green checkmark in status bar)
3. Check command palette for available commands
4. Review extension logs in output channels

### Performance Issues
1. Check server process memory usage
2. Verify large repositories don't cause timeouts
3. Monitor VS Code performance impact
4. Consider increasing timeout values if needed

## MCP Protocol Details

This extension implements the Model Context Protocol (MCP) specification:

- **Transport**: stdio (standard input/output)
- **Protocol**: JSON-RPC 2.0
- **Initialization**: Standard MCP handshake
- **Tools**: Dynamic tool discovery and invocation
- **Error Handling**: MCP-compliant error responses

### Message Flow

1. **Initialize**: Extension → Server handshake
2. **Tools List**: Discover available server capabilities
3. **Tool Call**: Execute specific functionality
4. **Response**: Receive structured results

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## License

This project is part of the Codex MCP Server ecosystem.

## Related Projects

- **Codex MCP Server**: The backend server this extension connects to
- **Model Context Protocol**: The underlying protocol specification

---

**Status**: ✅ **READY FOR TESTING**

The VS Code extension is fully functional and ready to connect to your Codex MCP server. Launch it in Extension Development Host mode and test the connection!