#!/usr/bin/env node

// Test script to verify MCP server responds correctly to protocol calls
import { spawn } from 'child_process';
import * as path from 'path';

async function testMCPServer() {
  console.log('🧪 Testing Codex MCP Server...\n');

  const serverPath = path.resolve('./dist/test-server.js');
  console.log(`Starting server: node ${serverPath}`);

  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    shell: false
  });

  // Test 1: List Tools
  console.log('\n📋 Test 1: List available tools...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Test 2: Call Hello Tool
  setTimeout(() => {
    console.log('\n👋 Test 2: Call hello tool...');
    const callToolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'hello',
        arguments: { name: 'VS Code User' }
      }
    };

    server.stdin.write(JSON.stringify(callToolRequest) + '\n');
  }, 1000);

  // Test 3: Call Search Tool
  setTimeout(() => {
    console.log('\n🔍 Test 3: Call test search tool...');
    const searchToolRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'test_search',
        arguments: { query: 'function database' }
      }
    };

    server.stdin.write(JSON.stringify(searchToolRequest) + '\n');
  }, 2000);

  // Capture server output
  let responseBuffer = '';
  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    
    // Try to parse JSON responses
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || ''; // Keep incomplete line
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line.trim());
          console.log(`✅ Response ${response.id}:`, JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('📄 Server output:', line.trim());
        }
      }
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });

  // Clean up after tests
  setTimeout(() => {
    console.log('\n🏁 Tests completed. Shutting down server...');
    server.kill();
    process.exit(0);
  }, 5000);
}

testMCPServer().catch(console.error);