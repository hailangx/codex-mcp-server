import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';

export interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private nextId = 1;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private outputChannel: vscode.OutputChannel;
  private isInitialized = false;
  private tools: MCPTool[] = [];

  constructor(
    private serverPath: string,
    private nodeCommand: string = 'node',
    private envOverrides: Record<string, string> = {}
  ) {
    super();
    this.outputChannel = vscode.window.createOutputChannel('Codex MCP Client');
  }

  async start(): Promise<void> {
    if (this.process) {
      return;
    }

    this.outputChannel.appendLine(`Starting MCP server: ${this.nodeCommand} ${this.serverPath}`);
    
    try {
      this.process = spawn(this.nodeCommand, [this.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...this.envOverrides }
      });

      this.process.stdout?.setEncoding('utf8');
      this.process.stderr?.setEncoding('utf8');

      this.process.stdout?.on('data', (data) => {
        this.handleServerOutput(data);
      });

      this.process.stderr?.on('data', (data) => {
        this.outputChannel.appendLine(`Server stderr: ${data}`);
      });

      this.process.on('close', (code) => {
        this.outputChannel.appendLine(`MCP server closed with code: ${code}`);
        this.process = null;
        this.isInitialized = false;
        this.emit('disconnected');
      });

      this.process.on('error', (error) => {
        this.outputChannel.appendLine(`MCP server error: ${error.message}`);
        this.emit('error', error);
      });

      // Initialize the MCP connection
      await this.initialize();
      
    } catch (error) {
      this.outputChannel.appendLine(`Failed to start MCP server: ${error}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isInitialized = false;
    }
  }

  private handleServerOutput(data: string): void {
    const lines = data.toString().split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      
      // Skip non-JSON lines (like startup messages)
      if (!trimmed.startsWith('{')) {
        this.outputChannel.appendLine(`Server output: ${trimmed}`);
        continue;
      }

      try {
        const response: MCPResponse = JSON.parse(trimmed);
        this.handleResponse(response);
      } catch (error) {
        this.outputChannel.appendLine(`Failed to parse response: ${trimmed}`);
      }
    }
  }

  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      
      if (response.error) {
        pending.reject(new Error(`MCP Error: ${response.error.message}`));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('MCP server is not running');
    }

    const id = this.nextId++;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      const requestJson = JSON.stringify(request) + '\n';
      this.outputChannel.appendLine(`Sending request: ${requestJson.trim()}`);
      
      this.process!.stdin!.write(requestJson);
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  private async initialize(): Promise<void> {
    try {
      const result = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'codex-vscode-extension', version: '0.0.1' }
      });

      this.outputChannel.appendLine(`Initialized: ${JSON.stringify(result)}`);
      this.isInitialized = true;
      
      // Get available tools
      await this.refreshTools();
      
      this.emit('connected');
    } catch (error) {
      this.outputChannel.appendLine(`Initialization failed: ${error}`);
      throw error;
    }
  }

  private async refreshTools(): Promise<void> {
    try {
      const result = await this.sendRequest('tools/list', {});
      this.tools = result.tools || [];
      this.outputChannel.appendLine(`Available tools: ${this.tools.map(t => t.name).join(', ')}`);
    } catch (error) {
      this.outputChannel.appendLine(`Failed to get tools: ${error}`);
    }
  }

  async callTool(name: string, arguments_: Record<string, any>): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('MCP client is not initialized');
    }

    try {
      const result = await this.sendRequest('tools/call', {
        name,
        arguments: arguments_
      });
      
      return result;
    } catch (error) {
      this.outputChannel.appendLine(`Tool call failed: ${error}`);
      throw error;
    }
  }

  getTools(): MCPTool[] {
    return [...this.tools];
  }

  isConnected(): boolean {
    return this.isInitialized && this.process !== null;
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }
}