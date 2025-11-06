#!/usr/bin/env node

/**
 * VS Code MCP Integration Diagnostic Tool
 * This script helps diagnose why VS Code isn't connecting to the MCP server directly
 */

console.log('🔍 VS Code MCP Integration Diagnostics\n');

// Check 1: VS Code Settings
console.log('1️⃣ Checking VS Code Settings...');
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const settingsPath = join(homedir(), 'AppData', 'Roaming', 'Code', 'User', 'settings.json');

try {
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  
  if (settings['mcp.servers']) {
    console.log('✅ MCP servers configuration found');
    console.log('📋 Configured servers:', Object.keys(settings['mcp.servers']));
    
    const codexServer = settings['mcp.servers']['codex'];
    if (codexServer) {
      console.log('✅ Codex server configuration found');
      console.log('🚀 Command:', codexServer.command);
      console.log('📝 Args:', codexServer.args);
      console.log('🌍 Environment:', codexServer.env);
    } else {
      console.log('❌ Codex server not found in MCP configuration');
    }
  } else {
    console.log('❌ No MCP servers configuration found');
  }
} catch (error) {
  console.log('❌ Could not read VS Code settings:', error.message);
}

// Check 2: GitHub Copilot Status
console.log('\n2️⃣ Checking GitHub Copilot Status...');
console.log('ℹ️  You need to check in VS Code:');
console.log('   - Command Palette → "GitHub Copilot: Show Status"');
console.log('   - Or bottom right status bar for Copilot icon');

// Check 3: MCP Feature Flag
console.log('\n3️⃣ Checking MCP Feature Support...');
console.log('ℹ️  MCP support might require:');
console.log('   - VS Code Insiders (preview features)');
console.log('   - Or specific feature flags enabled');
console.log('   - Your version: VS Code 1.105.1 (should support MCP)');

// Check 4: Server Path Validation
console.log('\n4️⃣ Validating Server Path...');
import { existsSync } from 'fs';

const serverPath = 'Q:\\src\\Codex\\dist\\test-server.js';
if (existsSync(serverPath)) {
  console.log('✅ Server file exists:', serverPath);
} else {
  console.log('❌ Server file not found:', serverPath);
}

// Check 5: Node.js Path
console.log('\n5️⃣ Checking Node.js...');
import { execSync } from 'child_process';

try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log('✅ Node.js version:', nodeVersion);
  
  // Check if node is in PATH for VS Code
  const nodePath = execSync('where node', { encoding: 'utf8' }).trim();
  console.log('📍 Node.js path:', nodePath);
} catch (error) {
  console.log('❌ Node.js not found or not in PATH');
}

// Check 6: VS Code Output Panel
console.log('\n6️⃣ VS Code Output Panel Check...');
console.log('ℹ️  To check VS Code MCP logs:');
console.log('   1. Open Output panel (Ctrl+Shift+U)');
console.log('   2. Select "GitHub Copilot" from dropdown');
console.log('   3. Look for MCP server connection logs');
console.log('   4. Also check "Extension Host" output');

// Check 7: Alternative Settings Location
console.log('\n7️⃣ Alternative Settings Locations...');
console.log('ℹ️  MCP settings might also be in:');
console.log('   - Workspace settings: .vscode/settings.json');
console.log('   - User settings (current): ~/AppData/Roaming/Code/User/settings.json');

console.log('\n🎯 Next Steps:');
console.log('1. Check VS Code Output panel for MCP logs');
console.log('2. Verify GitHub Copilot is active and logged in');
console.log('3. Try @mcp commands in VS Code Chat');
console.log('4. Check if VS Code Insiders is needed for MCP support');

console.log('\n🧪 Manual Test Command:');
console.log('Try this in VS Code Chat: @mcp hello name="Test"');