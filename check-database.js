#!/usr/bin/env node

/**
 * Simple Database Check
 * Quick check of database status
 */

import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📊 Quick Database Check\n');

const dbPath = join(__dirname, 'codex.db');

if (existsSync(dbPath)) {
  const stats = statSync(dbPath);
  console.log(`✅ Database file exists: ${dbPath}`);
  console.log(`📏 File size: ${stats.size} bytes`);
  console.log(`🕐 Last modified: ${stats.mtime}`);
  
  if (stats.size === 0) {
    console.log('⚠️  Database is empty - may still be initializing');
  } else {
    console.log('✅ Database has content');
  }
} else {
  console.log(`❌ Database file not found: ${dbPath}`);
}

// Also check for database in subdirectory (nested path issue)
const altDbPath = join(__dirname, 'codex.db', 'codex.db');
if (existsSync(altDbPath)) {
  const stats = statSync(altDbPath);
  console.log(`\n📁 Found database in nested path: ${altDbPath}`);
  console.log(`📏 File size: ${stats.size} bytes`);
  console.log(`🕐 Last modified: ${stats.mtime}`);
}