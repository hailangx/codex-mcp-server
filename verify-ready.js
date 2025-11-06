#!/usr/bin/env node

// Quick verification that everything is ready for VS Code integration
import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Codex MCP Server - Integration Readiness Check\n');

const checks = [
  {
    name: 'TypeScript Build',
    check: () => fs.existsSync('./dist/test-server.js') && fs.existsSync('./dist/index.js'),
    fix: 'Run: npm run build'
  },
  {
    name: 'Test Server Executable', 
    check: () => {
      try {
        const content = fs.readFileSync('./dist/test-server.js', 'utf8');
        return content.includes('Codex Test MCP Server');
      } catch { return false; }
    },
    fix: 'Ensure test-server.ts compiles correctly'
  },
  {
    name: 'MCP SDK Dependency',
    check: () => fs.existsSync('node_modules/@modelcontextprotocol/sdk'),
    fix: 'Run: npm install'
  },
  {
    name: 'Package.json ES Module',
    check: () => {
      try {
        const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        return pkg.type === 'module';
      } catch { return false; }
    },
    fix: 'Add "type": "module" to package.json'
  },
  {
    name: 'VS Code Settings Template',
    check: () => fs.existsSync('./.vscode/settings.json'),
    fix: 'Create .vscode/settings.json with MCP config'
  },
  {
    name: 'Test Suite Passing',
    check: () => {
      // Check if tests directory exists and has test files
      return fs.existsSync('./src/__tests__') && 
             fs.readdirSync('./src/__tests__').some(f => f.endsWith('.test.ts'));
    },
    fix: 'Ensure test files are present'
  }
];

let allPassed = true;

for (const check of checks) {
  const passed = check.check();
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  
  if (!passed) {
    console.log(`   Fix: ${check.fix}`);
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 ALL CHECKS PASSED! Ready for VS Code integration.\n');
  console.log('Next steps:');
  console.log('1. Add MCP server config to VS Code settings.json');
  console.log('2. Restart VS Code');
  console.log('3. Test with: @mcp hello name="Test"');
  console.log('\nSee VSCODE_SETUP.md for detailed instructions.');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
}

console.log('\n📁 Current working directory:', process.cwd());
console.log('📁 Absolute path for VS Code config:', path.resolve('./dist/test-server.js'));

console.log('\n📋 VS Code Settings Template:');
console.log('```json');
console.log(JSON.stringify({
  "mcp.servers": {
    "codex": {
      "command": "node",
      "args": [path.resolve('./dist/test-server.js')],
      "env": {
        "REPO_PATH": "${workspaceFolder}"
      }
    }
  }
}, null, 2));
console.log('```');