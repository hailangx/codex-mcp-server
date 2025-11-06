/**
 * Database Manager Tests
 * Tests SQLite operations and data integrity using our own codebase as test data
 */

import { DatabaseManager, FileRecord, SymbolRecord } from '../database/DatabaseManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DatabaseManager', () => {
  let tempDir: string;
  let database: DatabaseManager;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-db-test-'));
    database = new DatabaseManager(tempDir);
    await database.initialize();
  });

  afterEach(async () => {
    await database.close();
    // Clean up temporary directory  
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('File Operations', () => {
    it('should insert and retrieve file records correctly', async () => {
      // Use a sample from our own codebase
      const sampleFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/utils/Logger.ts',
        content: `export class Logger {
  private component: string;
  
  constructor(component: string) {
    this.component = component;
  }
  
  info(message: string): void {
    console.log(\`[\${this.component}] \${message}\`);
  }
}`,
        hash: 'abc123def456',
        size: 200,
        language: 'typescript',
        lastModified: new Date('2025-11-05T10:00:00.000Z')
      };

      // Insert file
      const fileId = await database.insertFile(sampleFile);
      expect(fileId).toBeGreaterThan(0);

      // Retrieve file
      const retrievedFile = await database.getFile(sampleFile.path);
      expect(retrievedFile).not.toBeNull();
      expect(retrievedFile!.path).toBe(sampleFile.path);
      expect(retrievedFile!.content).toBe(sampleFile.content);
      expect(retrievedFile!.language).toBe(sampleFile.language);
      expect(retrievedFile!.hash).toBe(sampleFile.hash);
    });

    it('should handle file updates with new content', async () => {
      const originalFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/test.ts',
        content: 'const x = 1;',
        hash: 'hash1',
        size: 12,
        language: 'typescript',
        lastModified: new Date('2025-11-05T10:00:00.000Z')
      };

      // Insert original file
      const fileId1 = await database.insertFile(originalFile);
      
      // Update with new content
      const updatedFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        ...originalFile,
        content: 'const x = 1;\nconst y = 2;',
        hash: 'hash2',
        size: 24,
        lastModified: new Date('2025-11-05T11:00:00.000Z')
      };

      const fileId2 = await database.insertFile(updatedFile);
      expect(fileId2).toBe(fileId1); // Should update existing record

      const retrieved = await database.getFile(originalFile.path);
      expect(retrieved!.content).toBe(updatedFile.content);
      expect(retrieved!.hash).toBe(updatedFile.hash);
    });

    it('should list all files in database', async () => {
      // Insert multiple test files
      const testFiles = [
        {
          path: 'src/index.ts',
          content: 'import { Server } from "mcp";',
          hash: 'hash1',
          size: 30,
          language: 'typescript',
          lastModified: new Date()
        },
        {
          path: 'src/database.ts', 
          content: 'export class DatabaseManager {}',
          hash: 'hash2',
          size: 32,
          language: 'typescript',
          lastModified: new Date()
        }
      ];

      for (const file of testFiles) {
        await database.insertFile(file);
      }

      const allFiles = await database.getAllFiles();
      expect(allFiles).toHaveLength(2);
      expect(allFiles.map(f => f.path)).toContain('src/index.ts');
      expect(allFiles.map(f => f.path)).toContain('src/database.ts');
    });

    it('should delete files and related data', async () => {
      const testFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/temp.ts',
        content: 'function test() { return true; }',
        hash: 'hash123',
        size: 35,
        language: 'typescript',
        lastModified: new Date()
      };

      await database.insertFile(testFile);
      
      // Verify file exists
      let retrieved = await database.getFile(testFile.path);
      expect(retrieved).not.toBeNull();

      // Delete file
      await database.deleteFile(testFile.path);

      // Verify file is deleted
      retrieved = await database.getFile(testFile.path);
      expect(retrieved).toBeNull();
    });
  });

  describe('Symbol Operations', () => {
    let testFileId: number;

    beforeEach(async () => {
      // Create a test file first
      const testFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/test-symbols.ts',
        content: `class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  multiply(x: number, y: number): number {
    return x * y;
  }
}

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}`,
        hash: 'symbols-hash',
        size: 200,
        language: 'typescript',
        lastModified: new Date()
      };

      testFileId = await database.insertFile(testFile);
    });

    it('should insert and retrieve symbols correctly', async () => {
      const classSymbol: Omit<SymbolRecord, 'id'> = {
        fileId: testFileId,
        name: 'Calculator',
        type: 'class',
        startLine: 1,
        endLine: 7,
        startColumn: 1,
        endColumn: 1,
        definition: 'class Calculator {',
        modifiers: ['export']
      };

      const symbolId = await database.insertSymbol(classSymbol);
      expect(symbolId).toBeGreaterThan(0);

      const symbols = await database.getSymbolsByFile(testFileId);
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('Calculator');
      expect(symbols[0].type).toBe('class');
      expect(symbols[0].startLine).toBe(1);
    });

    it('should handle multiple symbols per file', async () => {
      const symbols: Array<Omit<SymbolRecord, 'id'>> = [
        {
          fileId: testFileId,
          name: 'Calculator',
          type: 'class',
          startLine: 1,
          endLine: 7,
          startColumn: 1,
          endColumn: 1,
          definition: 'class Calculator {',
          modifiers: ['export']
        },
        {
          fileId: testFileId,
          name: 'add',
          type: 'method',
          startLine: 2,
          endLine: 4,
          startColumn: 3,
          endColumn: 3,
          definition: 'add(a: number, b: number): number {',
          modifiers: []
        },
        {
          fileId: testFileId,
          name: 'factorial',
          type: 'function',
          startLine: 9,
          endLine: 11,
          startColumn: 1,
          endColumn: 1,
          definition: 'function factorial(n: number): number {',
          modifiers: []
        }
      ];

      // Insert all symbols
      for (const symbol of symbols) {
        await database.insertSymbol(symbol);
      }

      // Retrieve and verify
      const retrievedSymbols = await database.getSymbolsByFile(testFileId);
      expect(retrievedSymbols).toHaveLength(3);
      
      const symbolNames = retrievedSymbols.map(s => s.name);
      expect(symbolNames).toContain('Calculator');
      expect(symbolNames).toContain('add');
      expect(symbolNames).toContain('factorial');
    });

    it('should find symbols by name across files', async () => {
      // Insert symbols in current file
      await database.insertSymbol({
        fileId: testFileId,
        name: 'Calculator',
        type: 'class',
        startLine: 1,
        endLine: 7,
        startColumn: 1,
        endColumn: 1,
        definition: 'class Calculator {',
        modifiers: []
      });

      // Create another file with same symbol name
      const anotherFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/another.ts',
        content: 'class Calculator { }',
        hash: 'another-hash',
        size: 20,
        language: 'typescript',
        lastModified: new Date()
      };

      const anotherFileId = await database.insertFile(anotherFile);
      await database.insertSymbol({
        fileId: anotherFileId,
        name: 'Calculator',
        type: 'class',
        startLine: 1,
        endLine: 1,
        startColumn: 1,
        endColumn: 20,
        definition: 'class Calculator { }',
        modifiers: []
      });

      // Find all Calculator symbols
      const calculatorSymbols = await database.findSymbolsByName('Calculator');
      expect(calculatorSymbols).toHaveLength(2);
      expect(calculatorSymbols.every(s => s.name === 'Calculator')).toBe(true);
    });

    it('should clear symbols when file is updated', async () => {
      // Insert initial symbols
      await database.insertSymbol({
        fileId: testFileId,
        name: 'TestFunction',
        type: 'function',
        startLine: 1,
        endLine: 3,
        startColumn: 1,
        endColumn: 1,
        definition: 'function TestFunction() {}',
        modifiers: []
      });

      // Verify symbol exists
      let symbols = await database.getSymbolsByFile(testFileId);
      expect(symbols).toHaveLength(1);

      // Clear symbols
      await database.clearSymbolsByFile(testFileId);

      // Verify symbols are cleared
      symbols = await database.getSymbolsByFile(testFileId);
      expect(symbols).toHaveLength(0);
    });
  });

  describe('Embedding Operations', () => {
    let testFileId: number;

    beforeEach(async () => {
      const testFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/test-embeddings.ts',
        content: 'function testEmbeddings() { return "test"; }',
        hash: 'embed-hash',
        size: 45,
        language: 'typescript',
        lastModified: new Date()
      };

      testFileId = await database.insertFile(testFile);
    });

    it('should store and retrieve embeddings', async () => {
      const testEmbedding = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      
      const embeddingRecord = {
        fileId: testFileId,
        chunkIndex: 0,
        content: 'function testEmbeddings() { return "test"; }',
        embedding: testEmbedding,
        metadata: { language: 'typescript', type: 'code' }
      };

      const embeddingId = await database.insertEmbedding(embeddingRecord);
      expect(embeddingId).toBeGreaterThan(0);

      const embeddings = await database.getEmbeddingsByFile(testFileId);
      expect(embeddings).toHaveLength(1);
      expect(embeddings[0].content).toBe(embeddingRecord.content);
      expect(embeddings[0].embedding).toEqual(testEmbedding);
      expect(embeddings[0].metadata.language).toBe('typescript');
    });

    it('should handle multiple embeddings per file', async () => {
      const embeddings = [
        {
          fileId: testFileId,
          chunkIndex: 0,
          content: 'function testEmbeddings() {',
          embedding: new Float32Array([0.1, 0.2, 0.3]),
          metadata: { type: 'function_start' }
        },
        {
          fileId: testFileId,
          chunkIndex: 1,
          content: 'return "test";',
          embedding: new Float32Array([0.4, 0.5, 0.6]),
          metadata: { type: 'return_statement' }
        }
      ];

      for (const embedding of embeddings) {
        await database.insertEmbedding(embedding);
      }

      const retrievedEmbeddings = await database.getEmbeddingsByFile(testFileId);
      expect(retrievedEmbeddings).toHaveLength(2);
      expect(retrievedEmbeddings[0].chunkIndex).toBe(0);
      expect(retrievedEmbeddings[1].chunkIndex).toBe(1);
    });
  });

  describe('Dependency Operations', () => {
    let sourceFileId: number;
    let targetFileId: number;

    beforeEach(async () => {
      // Create source file
      const sourceFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/main.ts',
        content: 'import { DatabaseManager } from "./database/DatabaseManager";',
        hash: 'source-hash',
        size: 60,
        language: 'typescript',
        lastModified: new Date()
      };

      sourceFileId = await database.insertFile(sourceFile);

      // Create target file
      const targetFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/database/DatabaseManager.ts',
        content: 'export class DatabaseManager {}',
        hash: 'target-hash',
        size: 32,
        language: 'typescript',
        lastModified: new Date()
      };

      targetFileId = await database.insertFile(targetFile);
    });

    it('should store and retrieve dependencies', async () => {
      const dependency = {
        sourceFileId,
        targetFileId,
        importPath: './database/DatabaseManager',
        importType: 'import' as const,
        isExternal: false,
        symbols: ['DatabaseManager']
      };

      const dependencyId = await database.insertDependency(dependency);
      expect(dependencyId).toBeGreaterThan(0);

      const dependencies = await database.getDependenciesByFile(sourceFileId);
      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].importPath).toBe('./database/DatabaseManager');
      expect(dependencies[0].symbols).toEqual(['DatabaseManager']);
      expect(dependencies[0].isExternal).toBe(false);
    });

    it('should handle external dependencies', async () => {
      const externalDependency = {
        sourceFileId,
        targetFileId: undefined,
        importPath: 'sqlite3',
        importType: 'import' as const,
        isExternal: true,
        symbols: ['Database']
      };

      await database.insertDependency(externalDependency);

      const dependencies = await database.getDependenciesByFile(sourceFileId);
      const external = dependencies.find(d => d.isExternal);
      
      expect(external).toBeDefined();
      expect(external!.importPath).toBe('sqlite3');
      expect(external!.targetFileId).toBeNull();
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close the database to force an error
      await database.close();

      // Try to perform an operation - should throw error
      await expect(database.getFile('nonexistent.ts')).rejects.toThrow();
    });

    it('should handle large content efficiently', async () => {
      const largeContent = 'const x = 1;\n'.repeat(10000); // 130KB of content
      
      const largeFile: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: 'src/large.ts',
        content: largeContent,
        hash: 'large-hash',
        size: largeContent.length,
        language: 'typescript',
        lastModified: new Date()
      };

      const startTime = Date.now();
      const fileId = await database.insertFile(largeFile);
      const endTime = Date.now();

      expect(fileId).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      const retrieved = await database.getFile(largeFile.path);
      expect(retrieved!.content).toBe(largeContent);
    });

    it('should maintain data integrity with concurrent operations', async () => {
      const operations: Promise<number>[] = [];

      // Create multiple concurrent insert operations
      for (let i = 0; i < 10; i++) {
        const file: Omit<FileRecord, 'id' | 'indexedAt'> = {
          path: `src/concurrent-${i}.ts`,
          content: `const value${i} = ${i};`,
          hash: `hash-${i}`,
          size: 20,
          language: 'typescript',
          lastModified: new Date()
        };

        operations.push(database.insertFile(file));
      }

      // Wait for all operations to complete
      const fileIds = await Promise.all(operations);

      // Verify all files were inserted
      expect(fileIds).toHaveLength(10);
      expect(fileIds.every(id => id > 0)).toBe(true);

      const allFiles = await database.getAllFiles();
      const concurrentFiles = allFiles.filter(f => f.path.startsWith('src/concurrent-'));
      expect(concurrentFiles).toHaveLength(10);
    });
  });
});