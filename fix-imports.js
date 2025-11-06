#!/usr/bin/env node

/**
 * Fix ES Module Imports
 * Add .js extensions to all relative imports for ES module compatibility
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

console.log('🔧 Fixing ES Module Imports...\n');

// Find all TypeScript files
const files = glob.sync('src/**/*.ts', { 
  ignore: ['src/**/*.d.ts', 'src/**/__tests__/**', 'src/**/test/**'] 
});

let totalFixes = 0;

files.forEach(filePath => {
  console.log(`📄 Processing: ${filePath}`);
  
  let content = readFileSync(filePath, 'utf8');
  let fixes = 0;
  
  // Fix relative imports without .js extension
  content = content.replace(
    /import\s+(?:{[^}]*}|\*|\w+)?\s*(?:,\s*(?:{[^}]*}|\*|\w+))?\s*from\s+['"](\.[^'"]*?)['"](?!\.js)/g,
    (match, importPath) => {
      fixes++;
      return match.replace(importPath, importPath + '.js');
    }
  );
  
  if (fixes > 0) {
    writeFileSync(filePath, content);
    console.log(`  ✅ Fixed ${fixes} imports`);
    totalFixes += fixes;
  } else {
    console.log(`  ✓ No fixes needed`);
  }
});

console.log(`\n🎉 Fixed ${totalFixes} imports across ${files.length} files`);

// Also fix the main index.ts and test-server.ts
const additionalFiles = ['src/index.ts', 'src/test-server.ts'];

additionalFiles.forEach(filePath => {
  try {
    console.log(`📄 Processing: ${filePath}`);
    
    let content = readFileSync(filePath, 'utf8');
    let fixes = 0;
    
    content = content.replace(
      /import\s+(?:{[^}]*}|\*|\w+)?\s*(?:,\s*(?:{[^}]*}|\*|\w+))?\s*from\s+['"](\.[^'"]*?)['"](?!\.js)/g,
      (match, importPath) => {
        fixes++;
        return match.replace(importPath, importPath + '.js');
      }
    );
    
    if (fixes > 0) {
      writeFileSync(filePath, content);
      console.log(`  ✅ Fixed ${fixes} imports`);
      totalFixes += fixes;
    } else {
      console.log(`  ✓ No fixes needed`);
    }
  } catch (e) {
    console.log(`  ⚠️  File not found or error: ${e.message}`);
  }
});

console.log(`\n✅ Total fixes applied: ${totalFixes}`);
console.log('🚀 Ready to rebuild with: npm run build');