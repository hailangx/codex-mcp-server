#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

// Check if we're in development mode
const isDev = process.argv.includes('--dev');
const repoPath = process.argv.find(arg => arg.startsWith('--repo='))?.split('=')[1];

// Set up environment
if (repoPath) {
  process.env.REPO_PATH = path.resolve(repoPath);
}

// Command to run
const command = isDev ? 'npm' : 'node';
const args = isDev ? ['run', 'dev'] : ['dist/index.js'];

console.log('🚀 Starting Codex MCP Server...');
console.log(`📁 Repository: ${process.env.REPO_PATH || process.cwd()}`);
console.log(`🔧 Mode: ${isDev ? 'Development' : 'Production'}`);

// Start the server
const server = spawn(command, args, {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`📴 Server stopped with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Gracefully shutting down...');
  server.kill('SIGTERM');
});