import sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { Logger } from '../utils/Logger.js';

export interface FileRecord {
  id?: number;
  path: string;
  content: string;
  hash: string;
  size: number;
  language: string;
  lastModified: Date;
  indexedAt: Date;
}

export interface SymbolRecord {
  id?: number;
  fileId: number;
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'method' | 'property';
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  definition: string;
  docstring?: string;
  modifiers: string[];
}

export interface EmbeddingRecord {
  id?: number;
  fileId: number;
  symbolId?: number;
  chunkIndex: number;
  content: string;
  embedding: Float32Array;
  metadata: Record<string, any>;
}

export interface DependencyRecord {
  id?: number;
  sourceFileId: number;
  targetFileId?: number;
  importPath: string;
  importType: 'import' | 'require' | 'include';
  isExternal: boolean;
  symbols: string[];
}

export class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private logger: Logger;
  private dbPath: string;

  constructor(dataDir: string) {
    this.logger = new Logger('DatabaseManager');
    this.dbPath = path.join(dataDir, 'codex.db');
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.logger.error('Failed to open database:', err);
          reject(err);
          return;
        }

        this.logger.info(`Database opened: ${this.dbPath}`);
        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const run = promisify(this.db.run.bind(this.db));

    // Files table
    await run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        hash TEXT NOT NULL,
        size INTEGER NOT NULL,
        language TEXT NOT NULL,
        last_modified DATETIME NOT NULL,
        indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Symbols table
    await run(`
      CREATE TABLE IF NOT EXISTS symbols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        start_column INTEGER NOT NULL,
        end_column INTEGER NOT NULL,
        definition TEXT NOT NULL,
        docstring TEXT,
        modifiers TEXT DEFAULT '[]',
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Embeddings table
    await run(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        symbol_id INTEGER,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB NOT NULL,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
        FOREIGN KEY (symbol_id) REFERENCES symbols (id) ON DELETE CASCADE
      )
    `);

    // Dependencies table
    await run(`
      CREATE TABLE IF NOT EXISTS dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_file_id INTEGER NOT NULL,
        target_file_id INTEGER,
        import_path TEXT NOT NULL,
        import_type TEXT NOT NULL,
        is_external BOOLEAN NOT NULL,
        symbols TEXT DEFAULT '[]',
        FOREIGN KEY (source_file_id) REFERENCES files (id) ON DELETE CASCADE,
        FOREIGN KEY (target_file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await run('CREATE INDEX IF NOT EXISTS idx_files_path ON files (path)');
    await run('CREATE INDEX IF NOT EXISTS idx_files_hash ON files (hash)');
    await run('CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols (name)');
    await run('CREATE INDEX IF NOT EXISTS idx_symbols_type ON symbols (type)');
    await run('CREATE INDEX IF NOT EXISTS idx_symbols_file_id ON symbols (file_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies (source_file_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies (target_file_id)');

    this.logger.info('Database tables created successfully');
  }

  // File operations
  async insertFile(file: Omit<FileRecord, 'id' | 'indexedAt'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      // First check if file already exists
      this.db!.get('SELECT id FROM files WHERE path = ?', [file.path], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update existing file
          const stmt = this.db!.prepare(`
            UPDATE files SET content = ?, hash = ?, size = ?, language = ?, last_modified = ?, indexed_at = CURRENT_TIMESTAMP
            WHERE path = ?
          `);

          stmt.run([
            file.content,
            file.hash,
            file.size,
            file.language,
            file.lastModified.toISOString(),
            file.path
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(row.id);
            }
          });
          stmt.finalize();
        } else {
          // Insert new file
          const stmt = this.db!.prepare(`
            INSERT INTO files (path, content, hash, size, language, last_modified)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          stmt.run([
            file.path,
            file.content,
            file.hash,
            file.size,
            file.language,
            file.lastModified.toISOString()
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.lastID);
            }
          });
          stmt.finalize();
        }
      });
    });
  }

  async getFile(path: string): Promise<FileRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT * FROM files WHERE path = ?',
        [path],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            resolve({
              id: row.id,
              path: row.path,
              content: row.content,
              hash: row.hash,
              size: row.size,
              language: row.language,
              lastModified: new Date(row.last_modified),
              indexedAt: new Date(row.indexed_at)
            });
          }
        }
      );
    });
  }

  async getAllFiles(): Promise<FileRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM files ORDER BY path', (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const files = rows.map(row => ({
            id: row.id,
            path: row.path,
            content: row.content,
            hash: row.hash,
            size: row.size,
            language: row.language,
            lastModified: new Date(row.last_modified),
            indexedAt: new Date(row.indexed_at)
          }));
          resolve(files);
        }
      });
    });
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM files WHERE path = ?', [path], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Symbol operations
  async insertSymbol(symbol: Omit<SymbolRecord, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db!.prepare(`
        INSERT INTO symbols (file_id, name, type, start_line, end_line, start_column, end_column, definition, docstring, modifiers)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        symbol.fileId,
        symbol.name,
        symbol.type,
        symbol.startLine,
        symbol.endLine,
        symbol.startColumn,
        symbol.endColumn,
        symbol.definition,
        symbol.docstring || null,
        JSON.stringify(symbol.modifiers)
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });

      stmt.finalize();
    });
  }

  async getSymbolsByFile(fileId: number): Promise<SymbolRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM symbols WHERE file_id = ? ORDER BY start_line',
        [fileId],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const symbols = rows.map(row => ({
              id: row.id,
              fileId: row.file_id,
              name: row.name,
              type: row.type,
              startLine: row.start_line,
              endLine: row.end_line,
              startColumn: row.start_column,
              endColumn: row.end_column,
              definition: row.definition,
              docstring: row.docstring,
              modifiers: JSON.parse(row.modifiers || '[]')
            }));
            resolve(symbols);
          }
        }
      );
    });
  }

  async findSymbolsByName(name: string, type?: string): Promise<SymbolRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = type 
      ? 'SELECT * FROM symbols WHERE name = ? AND type = ? ORDER BY file_id, start_line'
      : 'SELECT * FROM symbols WHERE name = ? ORDER BY file_id, start_line';
    
    const params = type ? [name, type] : [name];

    return new Promise((resolve, reject) => {
      this.db!.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const symbols = rows.map(row => ({
            id: row.id,
            fileId: row.file_id,
            name: row.name,
            type: row.type,
            startLine: row.start_line,
            endLine: row.end_line,
            startColumn: row.start_column,
            endColumn: row.end_column,
            definition: row.definition,
            docstring: row.docstring,
            modifiers: JSON.parse(row.modifiers || '[]')
          }));
          resolve(symbols);
        }
      });
    });
  }

  async clearSymbolsByFile(fileId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM symbols WHERE file_id = ?', [fileId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Embedding operations
  async insertEmbedding(embedding: Omit<EmbeddingRecord, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db!.prepare(`
        INSERT INTO embeddings (file_id, symbol_id, chunk_index, content, embedding, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const embeddingBuffer = Buffer.from(embedding.embedding.buffer);

      stmt.run([
        embedding.fileId,
        embedding.symbolId || null,
        embedding.chunkIndex,
        embedding.content,
        embeddingBuffer,
        JSON.stringify(embedding.metadata)
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });

      stmt.finalize();
    });
  }

  async getEmbeddingsByFile(fileId: number): Promise<EmbeddingRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM embeddings WHERE file_id = ? ORDER BY chunk_index',
        [fileId],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const embeddings = rows.map(row => ({
              id: row.id,
              fileId: row.file_id,
              symbolId: row.symbol_id,
              chunkIndex: row.chunk_index,
              content: row.content,
              embedding: new Float32Array(row.embedding.buffer),
              metadata: JSON.parse(row.metadata || '{}')
            }));
            resolve(embeddings);
          }
        }
      );
    });
  }

  async getAllEmbeddings(): Promise<EmbeddingRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM embeddings', (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const embeddings = rows.map(row => ({
            id: row.id,
            fileId: row.file_id,
            symbolId: row.symbol_id,
            chunkIndex: row.chunk_index,
            content: row.content,
            embedding: new Float32Array(row.embedding.buffer),
            metadata: JSON.parse(row.metadata || '{}')
          }));
          resolve(embeddings);
        }
      });
    });
  }

  async clearEmbeddingsByFile(fileId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM embeddings WHERE file_id = ?', [fileId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Dependency operations
  async insertDependency(dependency: Omit<DependencyRecord, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stmt = this.db!.prepare(`
        INSERT INTO dependencies (source_file_id, target_file_id, import_path, import_type, is_external, symbols)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        dependency.sourceFileId,
        dependency.targetFileId || null,
        dependency.importPath,
        dependency.importType,
        dependency.isExternal,
        JSON.stringify(dependency.symbols)
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });

      stmt.finalize();
    });
  }

  async getDependenciesByFile(fileId: number): Promise<DependencyRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM dependencies WHERE source_file_id = ?',
        [fileId],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const dependencies = rows.map(row => ({
              id: row.id,
              sourceFileId: row.source_file_id,
              targetFileId: row.target_file_id,
              importPath: row.import_path,
              importType: row.import_type,
              isExternal: Boolean(row.is_external),
              symbols: JSON.parse(row.symbols || '[]')
            }));
            resolve(dependencies);
          }
        }
      );
    });
  }

  async clearDependenciesByFile(fileId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM dependencies WHERE source_file_id = ?', [fileId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          this.logger.error('Error closing database:', err);
          reject(err);
        } else {
          this.logger.info('Database closed');
          this.db = null;
          resolve();
        }
      });
    });
  }
}