#!/usr/bin/env node

/**
 * Database Inspection Tool
 * Check what's in the SQLite database to verify indexing
 */

import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📊 Codex Database Inspector\n');

const dbPath = join(__dirname, 'codex.db');

if (!existsSync(dbPath)) {
  console.log(`❌ Database not found at: ${dbPath}`);
  console.log('📝 Run the server first to create and populate the database.');
  process.exit(1);
}

console.log(`📁 Database found: ${dbPath}\n`);

// Open database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Database opened successfully\n');
  inspectDatabase();
});

function inspectDatabase() {
  const queries = [
    {
      name: 'Files Count',
      query: 'SELECT COUNT(*) as count FROM files',
      handler: (row) => console.log(`📄 Files indexed: ${row.count}`)
    },
    {
      name: 'Recent Files',
      query: 'SELECT file_path, language, size FROM files ORDER BY created_at DESC LIMIT 5',
      handler: (row) => console.log(`   ${row.file_path} (${row.language}, ${row.size} bytes)`)
    },
    {
      name: 'Symbols Count',
      query: 'SELECT COUNT(*) as count FROM symbols',
      handler: (row) => console.log(`🎯 Symbols indexed: ${row.count}`)
    },
    {
      name: 'Symbol Types',
      query: 'SELECT symbol_type, COUNT(*) as count FROM symbols GROUP BY symbol_type ORDER BY count DESC',
      handler: (row) => console.log(`   ${row.symbol_type}: ${row.count}`)
    },
    {
      name: 'Recent Symbols',
      query: 'SELECT name, symbol_type, file_path FROM symbols ORDER BY created_at DESC LIMIT 5',
      handler: (row) => console.log(`   ${row.name} (${row.symbol_type}) in ${row.file_path}`)
    },
    {
      name: 'Dependencies Count',
      query: 'SELECT COUNT(*) as count FROM dependencies',
      handler: (row) => console.log(`🔗 Dependencies mapped: ${row.count}`)
    },
    {
      name: 'Embeddings Count',
      query: 'SELECT COUNT(*) as count FROM embeddings',
      handler: (row) => console.log(`🧠 Embeddings generated: ${row.count}`)
    }
  ];
  
  let completedQueries = 0;
  
  queries.forEach((queryObj, index) => {
    if (queryObj.query.startsWith('SELECT COUNT')) {
      // Single row queries
      db.get(queryObj.query, (err, row) => {
        if (err) {
          console.error(`❌ Error in ${queryObj.name}:`, err.message);
        } else if (row) {
          queryObj.handler(row);
        }
        
        completedQueries++;
        if (completedQueries === queries.length) {
          finishInspection();
        }
      });
    } else {
      // Multi-row queries
      console.log(`\n${queryObj.name}:`);
      db.all(queryObj.query, (err, rows) => {
        if (err) {
          console.error(`❌ Error in ${queryObj.name}:`, err.message);
        } else if (rows && rows.length > 0) {
          rows.forEach(queryObj.handler);
        } else {
          console.log('   (No data)');
        }
        
        completedQueries++;
        if (completedQueries === queries.length) {
          finishInspection();
        }
      });
    }
  });
}

function finishInspection() {
  console.log('\n📊 Database Inspection Complete');
  
  // Check if database has meaningful content
  db.get('SELECT COUNT(*) as files FROM files', (err, fileRow) => {
    db.get('SELECT COUNT(*) as symbols FROM symbols', (err2, symbolRow) => {
      if (fileRow && symbolRow) {
        const hasFiles = fileRow.files > 0;
        const hasSymbols = symbolRow.symbols > 0;
        
        console.log('\n🎯 Indexing Status:');
        if (hasFiles && hasSymbols) {
          console.log('✅ Repository is INDEXED and READY');
          console.log('✅ MCP server has code understanding capabilities');
        } else if (hasFiles) {
          console.log('⚠️  Files indexed but symbols missing');
          console.log('💡 Parser might need time to complete');
        } else {
          console.log('❌ No files indexed yet');
          console.log('💡 Server may need to be started to begin indexing');
        }
      }
      
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        }
        process.exit(0);
      });
    });
  });
}