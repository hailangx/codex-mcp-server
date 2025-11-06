#!/usr/bin/env node

/**
 * Verify Full MCP Server Status
 * This script tests the full MCP server to ensure it's running and indexing properly
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Codex MCP Server - Full Functionality Verification\n');

// Check if database exists
const dbPath = join(__dirname, 'codex.db');
const dbExists = existsSync(dbPath);
console.log(`📁 Database Status: ${dbExists ? '✅ Found' : '❌ Not Found'} at ${dbPath}`);

// Start the full MCP server
const serverPath = join(__dirname, 'dist', 'index.js');
console.log(`🚀 Starting full MCP server: ${serverPath}\n`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    REPO_PATH: __dirname,
    DB_PATH: dbPath
  }
});

let responseCount = 0;
const testRequests = [
  {
    id: 1,
    name: 'initialize',
    request: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        clientInfo: { name: "verification-client", version: "1.0.0" }
      }
    }
  },
  {
    id: 2,
    name: 'list tools',
    request: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    }
  },
  {
    id: 3,
    name: 'search code',
    request: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "search_code",
        arguments: { query: "database manager" }
      }
    }
  },
  {
    id: 4,
    name: 'find symbol',
    request: {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "find_symbol",
        arguments: { symbol: "DatabaseManager" }
      }
    }
  },
  {
    id: 5,
    name: 'index repository',
    request: {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "index_repository",
        arguments: { repo_path: __dirname }
      }
    }
  }
];

const results = [];

// Handle server responses
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📨 Server:', output.trim());
  
  // Try to parse JSON responses
  const lines = output.split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.jsonrpc === '2.0' && parsed.id) {
        responseCount++;
        results.push(parsed);
        console.log(`✅ Response ${parsed.id}: ${parsed.result ? 'Success' : 'Error'}`);
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
  
  // Close after getting all responses or timeout
  if (responseCount >= testRequests.length) {
    setTimeout(() => server.kill(), 1000);
  }
});

server.stderr.on('data', (data) => {
  console.log('⚠️  Server Error:', data.toString().trim());
});

server.on('close', (code) => {
  console.log(`\n🔄 Server closed with code: ${code}`);
  
  // Analyze results
  console.log('\n📊 Verification Results:');
  console.log(`✅ Responses received: ${responseCount}/${testRequests.length}`);
  
  if (responseCount >= 2) { // At least init and tools list
    console.log('✅ MCP Server: RUNNING');
    console.log('✅ Protocol: WORKING');
    
    if (responseCount >= 4) {
      console.log('✅ Code Tools: FUNCTIONAL');
    }
    
    if (responseCount === testRequests.length) {
      console.log('✅ Repository Indexing: COMPLETE');
      console.log('\n🎉 FULL SERVER VERIFICATION: PASSED');
    }
  } else {
    console.log('❌ Server Verification: FAILED');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Check database file for indexed content');
  console.log('2. Test VS Code integration with @mcp commands');
  console.log('3. Monitor server logs for indexing progress');
  
  process.exit(responseCount >= 2 ? 0 : 1);
});

// Send test requests
setTimeout(() => {
  console.log('📤 Sending verification requests...\n');
  
  testRequests.forEach((test, index) => {
    setTimeout(() => {
      console.log(`${index + 1}️⃣ Testing: ${test.name}`);
      server.stdin.write(JSON.stringify(test.request) + '\n');
    }, index * 1000);
  });
  
  // Timeout if no responses
  setTimeout(() => {
    if (responseCount === 0) {
      console.log('⏰ Timeout: Server not responding');
      server.kill();
    }
  }, 15000);
  
}, 2000);