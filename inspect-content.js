#!/usr/bin/env node

/**
 * Database Content Inspector
 * Check what's indexed in the database using the server tools
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Database Content Inspector\n');

const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    REPO_PATH: __dirname
  }
});

let isReady = false;
let requestCount = 0;

const testQueries = [
  {
    name: "Search for database code",
    request: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "search_code",
        arguments: { query: "database manager", limit: 3 }
      }
    }
  },
  {
    name: "Find DatabaseManager symbol",
    request: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "find_symbol",
        arguments: { symbol: "DatabaseManager" }
      }
    }
  },
  {
    name: "Search for TypeScript code",
    request: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "search_code",
        arguments: { query: "typescript", limit: 5 }
      }
    }
  }
];

server.stdout.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.includes('[INFO]') || line.includes('[WARN]') || line.includes('[ERROR]')) {
      console.log('📨 Server:', line.trim());
    } else {
      try {
        const response = JSON.parse(line);
        if (response.jsonrpc === '2.0' && response.id) {
          console.log(`\n✅ Response ${response.id}:`);
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              if (content.type === 'text') {
                const text = content.text;
                if (text === '[]') {
                  console.log('   No results found');
                } else {
                  console.log(`   ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
                }
              }
            });
          }
          
          requestCount++;
          if (requestCount >= testQueries.length) {
            setTimeout(() => server.kill(), 1000);
          }
        }
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
  
  // Check if server is ready
  if (output.includes('Codex MCP Server started successfully') && !isReady) {
    isReady = true;
    
    setTimeout(() => {
      console.log('\n📤 Testing database content...\n');
      testQueries.forEach((test, index) => {
        setTimeout(() => {
          console.log(`${index + 1}️⃣ ${test.name}`);
          server.stdin.write(JSON.stringify(test.request) + '\n');
        }, index * 1000);
      });
    }, 2000);
  }
});

server.stderr.on('data', (data) => {
  const error = data.toString().trim();
  if (!error.includes('[WARN]')) {
    console.log('⚠️  Error:', error);
  }
});

server.on('close', (code) => {
  console.log(`\n🔄 Server closed with code: ${code}`);
  console.log(`📊 Tested ${requestCount}/${testQueries.length} queries`);
  
  if (requestCount === testQueries.length) {
    console.log('✅ Database content inspection completed');
  } else {
    console.log('⚠️  Some queries may not have completed');
  }
});

// Timeout after 15 seconds
setTimeout(() => {
  if (!server.killed) {
    console.log('\n⏰ Timeout - closing server');
    server.kill();
  }
}, 15000);