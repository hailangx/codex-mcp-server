#!/usr/bin/env node

/**
 * Trigger Repository Indexing
 * Send indexing command to the server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Triggering Repository Indexing\n');

const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    REPO_PATH: __dirname
  }
});

let isReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📨 Server:', output.trim());
  
  // Check if server is ready
  if (output.includes('Codex MCP Server started successfully')) {
    isReady = true;
    
    // Wait a moment for initialization, then send index request
    setTimeout(() => {
      console.log('\n📤 Sending index repository request...');
      const indexRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "index_repository",
          arguments: {
            force: true,
            path: __dirname
          }
        }
      };
      
      server.stdin.write(JSON.stringify(indexRequest) + '\n');
      
      // Close after indexing completes (generous timeout)
      setTimeout(() => {
        console.log('\n⏰ Indexing timeout - closing server');
        server.kill();
      }, 30000);
    }, 2000);
  }
  
  // Check for indexing completion
  if (output.includes('Indexing completed') || output.includes('Repository indexing completed')) {
    setTimeout(() => {
      console.log('\n✅ Indexing completed - closing server');
      server.kill();
    }, 1000);
  }
});

server.stderr.on('data', (data) => {
  console.log('⚠️  Server Error:', data.toString().trim());
});

server.on('close', (code) => {
  console.log(`\n🔄 Server closed with code: ${code}`);
  if (isReady) {
    console.log('✅ Repository indexing triggered successfully');
  } else {
    console.log('❌ Server failed to start properly');
  }
});