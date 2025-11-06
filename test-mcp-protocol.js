#!/usr/bin/env node

/**
 * Test MCP Protocol Communication
 * This script tests the MCP server's protocol handling to ensure it works with VS Code
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing MCP Protocol Communication\n');

// Start the MCP server
const serverPath = join(__dirname, 'dist', 'test-server.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseCount = 0;
const expectedResponses = 3;
let testResults = [];

// Handle server responses
server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  console.log('📨 Server Response:', response);
  
  try {
    const parsed = JSON.parse(response);
    if (parsed.jsonrpc === '2.0' && parsed.id) {
      responseCount++;
      testResults.push(parsed);
    }
  } catch (e) {
    // Ignore non-JSON output (like startup messages)
  }
  
  // Close after getting all expected responses
  if (responseCount >= expectedResponses) {
    setTimeout(() => {
      server.kill();
    }, 100);
  }
});

server.stderr.on('data', (data) => {
  console.log('⚠️  Server Error:', data.toString());
});

server.on('close', (code) => {
  console.log(`\n🔄 Server closed with code: ${code}`);
  
  // Analyze results
  console.log('\n📊 Test Results Analysis:');
  console.log(`✅ Responses received: ${responseCount}/${expectedResponses}`);
  
  if (responseCount >= expectedResponses) {
    console.log('✅ MCP Protocol Test: PASSED');
    console.log('✅ Server responds to initialize, tools/list, and tools/call');
    console.log('✅ Ready for VS Code integration!');
  } else {
    console.log('❌ MCP Protocol Test: FAILED');
    console.log('❌ Server did not respond to all test requests');
  }
  
  process.exit(responseCount >= expectedResponses ? 0 : 1);
});

// Wait for server to start
setTimeout(() => {
  console.log('📤 Sending test requests...\n');
  
  // Test 1: Initialize
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "test-client", version: "1.0.0" }
    }
  };
  
  server.stdin.write(JSON.stringify(initRequest) + '\n');
  console.log('1️⃣ Sent initialize request');
  
  // Test 2: List tools
  setTimeout(() => {
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };
    
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    console.log('2️⃣ Sent tools/list request');
  }, 500);
  
  // Test 3: Call hello tool
  setTimeout(() => {
    const callToolRequest = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "hello",
        arguments: { name: "Protocol Tester" }
      }
    };
    
    server.stdin.write(JSON.stringify(callToolRequest) + '\n');
    console.log('3️⃣ Sent tools/call request (hello)\n');
  }, 1000);
  
}, 1000);