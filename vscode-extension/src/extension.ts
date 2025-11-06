import * as vscode from 'vscode';
import { MCPClient } from './mcpClient';

let mcpClient: MCPClient | null = null;
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Codex MCP');
    outputChannel.appendLine('Codex MCP Client extension activated');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'codex.openPanel';
    statusBarItem.text = '$(disconnected) Codex';
    statusBarItem.tooltip = 'Codex MCP Server - Disconnected';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Initialize MCP client
    initializeMCPClient();

    // Register commands
    registerCommands(context);

        // Register chat participant for @codex usage in VS Code Chat
        registerChatParticipant(context);

    // Auto-start if configured
    const config = vscode.workspace.getConfiguration('codex');
    if (config.get('autoStart', true)) {
        vscode.commands.executeCommand('codex.startServer');
    }
}

function initializeMCPClient() {
    const config = vscode.workspace.getConfiguration('codex');
        const serverMode = config.get<string>('serverMode', 'test');
        const testServerPath = config.get<string>('serverPath', 'Q:\\src\\Codex\\dist\\test-server.js');
        const fullServerPath = config.get<string>('fullServerPath', 'Q:\\src\\Codex\\dist\\index.js');
        const serverPath = serverMode === 'full' ? fullServerPath : testServerPath;
    const nodeCommand = config.get<string>('nodeCommand', 'node');
        const repoPath = config.get<string>('repoPath', 'Q:\\src\\Codex');
        const dbPath = config.get<string>('dbPath', 'Q:\\src\\Codex\\codex.db');

        mcpClient = new MCPClient(serverPath, nodeCommand, { REPO_PATH: repoPath, DB_PATH: dbPath });

    mcpClient.on('connected', () => {
        statusBarItem.text = '$(check) Codex';
        statusBarItem.tooltip = 'Codex MCP Server - Connected';
        vscode.window.showInformationMessage('Codex MCP Server connected successfully!');
    });

    mcpClient.on('disconnected', () => {
        statusBarItem.text = '$(disconnected) Codex';
        statusBarItem.tooltip = 'Codex MCP Server - Disconnected';
    });

    mcpClient.on('error', (error) => {
        statusBarItem.text = '$(error) Codex';
        statusBarItem.tooltip = `Codex MCP Server - Error: ${error.message}`;
        vscode.window.showErrorMessage(`Codex MCP Error: ${error.message}`);
    });
}

function registerCommands(context: vscode.ExtensionContext) {
    // Test connection command
    const helloCommand = vscode.commands.registerCommand('codex.hello', async () => {
        if (!mcpClient || !mcpClient.isConnected()) {
            vscode.window.showWarningMessage('Codex MCP server is not connected. Starting server...');
            await vscode.commands.executeCommand('codex.startServer');
            return;
        }

        try {
            const result = await mcpClient.callTool('hello', { name: 'VS Code Extension' });
            const message = result.content?.[0]?.text || 'Hello from Codex MCP!';
            vscode.window.showInformationMessage(message);
            outputChannel.appendLine(`Hello result: ${JSON.stringify(result)}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to call hello: ${error}`);
            outputChannel.appendLine(`Hello error: ${error}`);
        }
    });

    // Search command
    const searchCommand = vscode.commands.registerCommand('codex.search', async () => {
        if (!mcpClient || !mcpClient.isConnected()) {
            vscode.window.showWarningMessage('Codex MCP server is not connected. Starting server...');
            await vscode.commands.executeCommand('codex.startServer');
            return;
        }

        const query = await vscode.window.showInputBox({
            prompt: 'Enter search query',
            placeHolder: 'Search your codebase...'
        });

        if (!query) {
            return;
        }

            try {
                // Prefer full search tool if available
                const tools = mcpClient.getTools().map(t => t.name);
                const chosenTool = tools.includes('search_code') ? 'search_code' : (tools.includes('test_search') ? 'test_search' : tools[0]);
                const result = await mcpClient.callTool(chosenTool, { query });
            const message = result.content?.[0]?.text || 'Search completed';
            
            // Show results in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: `Codex Search Results for: "${query}"\n\n${message}`,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
            
            outputChannel.appendLine(`Search result: ${JSON.stringify(result)}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Search failed: ${error}`);
            outputChannel.appendLine(`Search error: ${error}`);
        }
    });

    // Find symbol command
    const findSymbolCommand = vscode.commands.registerCommand('codex.findSymbol', async () => {
        const editor = vscode.window.activeTextEditor;
        let defaultSymbol = '';
        
        if (editor && editor.selection) {
            defaultSymbol = editor.document.getText(editor.selection);
        }

        const symbol = await vscode.window.showInputBox({
            prompt: 'Enter symbol name to find',
            placeHolder: 'Symbol name (class, function, variable)...',
            value: defaultSymbol
        });

        if (!symbol) {
            return;
        }

        if (!mcpClient || !mcpClient.isConnected()) {
            vscode.window.showWarningMessage('Codex MCP server is not connected. Starting server...');
            await vscode.commands.executeCommand('codex.startServer');
            return;
        }

            try {
                const tools = mcpClient.getTools().map(t => t.name);
                // Use dedicated symbol tool if available
                let chosenTool: string | undefined;
                if (tools.includes('find_symbol')) {
                    chosenTool = 'find_symbol';
                } else if (tools.includes('search_code')) {
                    chosenTool = 'search_code';
                } else if (tools.includes('test_search')) {
                    chosenTool = 'test_search';
                } else {
                    chosenTool = tools[0];
                }
                const result = await mcpClient.callTool(chosenTool, { 
                    query: `symbol: ${symbol}` 
                });
            const message = result.content?.[0]?.text || 'Symbol search completed';
            
            // Show results in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: `Codex Symbol Search for: "${symbol}"\n\n${message}`,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
            
            outputChannel.appendLine(`Symbol search result: ${JSON.stringify(result)}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Symbol search failed: ${error}`);
            outputChannel.appendLine(`Symbol search error: ${error}`);
        }
    });

    // Open panel command
    const openPanelCommand = vscode.commands.registerCommand('codex.openPanel', () => {
        createWebviewPanel();
    });

    // Index repository command
    const indexRepositoryCommand = vscode.commands.registerCommand('codex.indexRepository', async () => {
        vscode.window.showInformationMessage('Repository indexing will be available when using the full Codex server.');
    });

    // Start server command (internal)
    const startServerCommand = vscode.commands.registerCommand('codex.startServer', async () => {
        if (mcpClient && mcpClient.isConnected()) {
            vscode.window.showInformationMessage('Codex MCP server is already running.');
            return;
        }

        try {
            statusBarItem.text = '$(loading~spin) Codex';
            statusBarItem.tooltip = 'Codex MCP Server - Starting...';
            
            if (!mcpClient) {
                initializeMCPClient();
            }
            
            await mcpClient!.start();
        } catch (error) {
            statusBarItem.text = '$(error) Codex';
            statusBarItem.tooltip = `Codex MCP Server - Start failed: ${error}`;
            vscode.window.showErrorMessage(`Failed to start Codex MCP server: ${error}`);
        }
    });

    // Stop server command (internal)
    const stopServerCommand = vscode.commands.registerCommand('codex.stopServer', async () => {
        if (mcpClient) {
            await mcpClient.stop();
            statusBarItem.text = '$(disconnected) Codex';
            statusBarItem.tooltip = 'Codex MCP Server - Stopped';
            vscode.window.showInformationMessage('Codex MCP server stopped.');
        }
    });

    // Register all commands
    context.subscriptions.push(
        helloCommand,
        searchCommand,
        findSymbolCommand,
        openPanelCommand,
        indexRepositoryCommand,
        startServerCommand,
        stopServerCommand
    );
}


    function registerChatParticipant(context: vscode.ExtensionContext) {
        try {
            const participant = (vscode as any).chat?.createChatParticipant?.('codex', async (request: any, _chatContext: any, stream: any, _token: any) => {
                // Ensure server started
                if (!mcpClient || !mcpClient.isConnected()) {
                    await vscode.commands.executeCommand('codex.startServer');
                }

                const rawPrompt: string = request.prompt || '';
                const lower = rawPrompt.toLowerCase().trim();
                let mode: 'search' | 'symbol' | 'index' = 'search';
                let query = rawPrompt.trim();

                if (request.command === 'search') {
                    mode = 'search';
                    query = rawPrompt.replace(/^search\s+/i, '').trim();
                } else if (request.command === 'symbol' || lower.startsWith('symbol ') || lower.startsWith('find ')) {
                    mode = 'symbol';
                    query = rawPrompt.replace(/^(symbol|find)\s+/i, '').trim();
                } else if (request.command === 'index' || lower.startsWith('index')) {
                    mode = 'index';
                }

                try {
                    const tools = mcpClient!.getTools().map(t => t.name);
                    let toolToUse: string | undefined;
                    if (mode === 'index') {
                        toolToUse = tools.includes('index_repository') ? 'index_repository' : tools.find(t => t.includes('index'));
                        if (!toolToUse) {
                            stream.markdown('Indexing tool not available.');
                            return;
                        }
                        stream.markdown('Starting repository indexing...');
                        const result = await mcpClient!.callTool(toolToUse, {});
                        stream.markdown('Indexing complete.');
                        return;
                    }

                    if (mode === 'symbol') {
                        if (tools.includes('find_symbol')) {
                            toolToUse = 'find_symbol';
                        } else if (tools.includes('search_code')) {
                            toolToUse = 'search_code';
                        } else {
                            toolToUse = tools.includes('test_search') ? 'test_search' : tools[0];
                        }
                        // Pass symbol query
                        const result = await mcpClient!.callTool(toolToUse, { query: `symbol: ${query}` });
                        const text = result.content?.[0]?.text || JSON.stringify(result);
                        stream.markdown(`**Symbol Results for "${query}"**\n\n${'```'}\n${text}\n${'```'}`);
                        return;
                    }

                    // Default search mode
                    if (tools.includes('search_code')) {
                        toolToUse = 'search_code';
                    } else if (tools.includes('test_search')) {
                        toolToUse = 'test_search';
                    } else {
                        toolToUse = tools[0];
                    }
                    const result = await mcpClient!.callTool(toolToUse, { query });
                    const text = result.content?.[0]?.text || JSON.stringify(result);
                    stream.markdown(`**Search Results for "${query}"**\n\n${'```'}\n${text}\n${'```'}`);
                } catch (err) {
                    stream.markdown(`*Error:* ${(err as Error).message}`);
                }
            });
            if (participant && participant.iconPath === undefined) {
                participant.iconPath = new vscode.ThemeIcon('search');
            }
            outputChannel.appendLine('Chat participant @codex registered.');
        } catch (e) {
            outputChannel.appendLine(`Failed to register chat participant: ${(e as Error).message}`);
        }
    }
function createWebviewPanel() {
    const panel = vscode.window.createWebviewPanel(
        'codexPanel',
        'Codex MCP Client',
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getWebviewContent();

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'hello':
                await vscode.commands.executeCommand('codex.hello');
                break;
            case 'search':
                if (message.query) {
                    // Simulate search with provided query
                    if (mcpClient && mcpClient.isConnected()) {
                        try {
                            const result = await mcpClient.callTool('test_search', { query: message.query });
                            panel.webview.postMessage({
                                command: 'searchResult',
                                result: result.content?.[0]?.text || 'Search completed'
                            });
                        } catch (error) {
                            panel.webview.postMessage({
                                command: 'error',
                                message: `Search failed: ${error}`
                            });
                        }
                    } else {
                        panel.webview.postMessage({
                            command: 'error',
                            message: 'MCP server is not connected'
                        });
                    }
                }
                break;
            case 'getStatus':
                panel.webview.postMessage({
                    command: 'status',
                    connected: mcpClient ? mcpClient.isConnected() : false,
                    tools: mcpClient ? mcpClient.getTools() : []
                });
                break;
        }
    });
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codex MCP Client</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .status {
            margin-bottom: 20px;
            padding: 10px;
            border-radius: 4px;
        }
        .status.connected {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-testing-iconPassed);
        }
        .status.disconnected {
            background-color: var(--vscode-testing-iconFailed);
            color: var(--vscode-testing-iconFailed);
        }
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            margin: 4px;
            border-radius: 4px;
            cursor: pointer;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .input {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            margin: 4px 0;
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
        }
        .result {
            margin-top: 20px;
            padding: 10px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            white-space: pre-wrap;
        }
        .tools {
            margin-top: 20px;
        }
        .tool {
            padding: 8px;
            margin: 4px 0;
            background-color: var(--vscode-list-inactiveSelectionBackground);
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Codex MCP Client</h1>
        <p>Direct integration with Codex MCP server</p>
    </div>

    <div id="status" class="status disconnected">
        <strong>Status:</strong> <span id="statusText">Checking...</span>
    </div>

    <div>
        <button class="button" onclick="testConnection()">Test Connection</button>
        <button class="button" onclick="refreshStatus()">Refresh Status</button>
    </div>

    <div>
        <h3>Search Code</h3>
        <input type="text" id="searchQuery" class="input" placeholder="Enter search query..." />
        <button class="button" onclick="searchCode()">Search</button>
    </div>

    <div id="result" class="result" style="display: none;"></div>

    <div class="tools">
        <h3>Available Tools</h3>
        <div id="toolsList"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function testConnection() {
            vscode.postMessage({ command: 'hello' });
            showResult('Testing connection...');
        }

        function searchCode() {
            const query = document.getElementById('searchQuery').value;
            if (query.trim()) {
                vscode.postMessage({ command: 'search', query: query });
                showResult('Searching...');
            }
        }

        function refreshStatus() {
            vscode.postMessage({ command: 'getStatus' });
        }

        function showResult(text) {
            const resultDiv = document.getElementById('result');
            resultDiv.textContent = text;
            resultDiv.style.display = 'block';
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'searchResult':
                    showResult(message.result);
                    break;
                case 'error':
                    showResult('Error: ' + message.message);
                    break;
                case 'status':
                    updateStatus(message.connected, message.tools);
                    break;
            }
        });

        function updateStatus(connected, tools) {
            const statusDiv = document.getElementById('status');
            const statusText = document.getElementById('statusText');
            const toolsList = document.getElementById('toolsList');

            if (connected) {
                statusDiv.className = 'status connected';
                statusText.textContent = 'Connected';
            } else {
                statusDiv.className = 'status disconnected';
                statusText.textContent = 'Disconnected';
            }

            // Update tools list
            toolsList.innerHTML = '';
            if (tools && tools.length > 0) {
                tools.forEach(tool => {
                    const toolDiv = document.createElement('div');
                    toolDiv.className = 'tool';
                    toolDiv.innerHTML = '<strong>' + tool.name + '</strong><br/>' + tool.description;
                    toolsList.appendChild(toolDiv);
                });
            } else {
                toolsList.innerHTML = '<div class="tool">No tools available</div>';
            }
        }

        // Get initial status
        refreshStatus();
    </script>
</body>
</html>`;
}

export function deactivate() {
    if (mcpClient) {
        mcpClient.stop();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}