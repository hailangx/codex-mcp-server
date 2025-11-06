#!/usr/bin/env node

/**
 * Simple Server Test
 * Basic test to see if the full server starts and responds
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Simple Server Test\n');

const serverPath = join(__dirname, 'dist', 'index.js');
console.log(`🚀 Starting server: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    REPO_PATH: __dirname,
    DB_PATH: join(__dirname, 'codex.db')
  }
});

let hasOutput = false;

server.stdout.on('data', (data) => {
  hasOutput = true;
  console.log('📨 Server Output:', data.toString().trim());
});

server.stderr.on('data', (data) => {
  hasOutput = true;
  console.log('⚠️  Server Error:', data.toString().trim());
});

server.on('close', (code) => {
  console.log(`\n🔄 Server closed with code: ${code}`);
  if (!hasOutput) {
    console.log('⚠️  No output received from server');
  }
});

// Send a simple initialize request
setTimeout(() => {
  console.log('📤 Sending initialize request...');
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "simple-test", version: "1.0.0" }
    }
  };
  
  server.stdin.write(JSON.stringify(initRequest) + '\n');
  
  // Close after 3 seconds
  setTimeout(() => {
    console.log('⏰ Timeout - closing server');
    server.kill();
  }, 3000);
}, 1000);