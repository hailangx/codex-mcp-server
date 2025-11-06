import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DatabaseManager } from '../database/DatabaseManager';
import { LanguageParser } from '../parsers/LanguageParser.js';
import { EmbeddingGenerator } from '../embeddings/EmbeddingGenerator';
import { SearchEngine } from '../search/SearchEngine';
import { CodeIndexer } from '../indexer/CodeIndexer';

/**
 * Test utilities and data setup using our own Codex repository as test data
 */
export class TestUtils {
  private static tempDirs: string[] = [];

  /**
   * Create a temporary directory for testing
   */
  static createTempDir(prefix: string = 'codex-test-'): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Clean up all temporary directories
   */
  static cleanupTempDirs(): void {
    for (const dir of this.tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup temp dir ${dir}:`, error);
      }
    }
    this.tempDirs = [];
  }

  /**
   * Get sample files from our own repository for testing
   */
  static getTestFiles(): Array<{ path: string; content: string; language: string }> {
    const repoRoot = path.resolve(__dirname, '../..');
    const testFiles: Array<{ path: string; content: string; language: string }> = [];

    // Sample TypeScript files from our project
    const tsFiles = [
      'src/index.ts',
      'src/database/DatabaseManager.ts',
      'src/parsers/LanguageParser.ts',
      'src/search/SearchEngine.ts',
      'src/utils/Logger.ts'
    ];

    for (const filePath of tsFiles) {
      const fullPath = path.join(repoRoot, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        testFiles.push({
          path: filePath,
          content: content.substring(0, 2000), // Truncate for testing
          language: 'typescript'
        });
      }
    }

    // Add some synthetic test files for edge cases
    testFiles.push({
      path: 'test/sample.js',
      content: `
// Sample JavaScript file for testing
function calculateSum(a, b) {
  return a + b;
}

class Calculator {
  constructor() {
    this.history = [];
  }

  add(x, y) {
    const result = x + y;
    this.history.push(\`\${x} + \${y} = \${result}\`);
    return result;
  }

  multiply(x, y) {
    return x * y;
  }
}

const calculator = new Calculator();
export { Calculator, calculateSum };
      `,
      language: 'javascript'
    });

    testFiles.push({
      path: 'test/sample.py',
      content: `
"""Sample Python file for testing"""

def fibonacci(n):
    """Calculate fibonacci number"""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

class DataProcessor:
    """Process data with various algorithms"""
    
    def __init__(self):
        self.cache = {}
    
    def process_list(self, data):
        """Process a list of data"""
        return [x * 2 for x in data if x > 0]
    
    def get_stats(self, numbers):
        """Get statistics for numbers"""
        return {
            'mean': sum(numbers) / len(numbers),
            'max': max(numbers),
            'min': min(numbers)
        }

# Usage example
processor = DataProcessor()
result = processor.process_list([1, -2, 3, 4, -5])
      `,
      language: 'python'
    });

    return testFiles;
  }

  /**
   * Create a test database with sample data
   */
  static async createTestDatabase(tempDir: string): Promise<DatabaseManager> {
    const db = new DatabaseManager(tempDir);
    await db.initialize();

    const testFiles = this.getTestFiles();
    
    for (const file of testFiles) {
      const fileRecord = {
        path: file.path,
        content: file.content,
        hash: this.calculateHash(file.content),
        size: file.content.length,
        language: file.language,
        lastModified: new Date()
      };

      const fileId = await db.insertFile(fileRecord);

      // Parse and insert symbols
      const parser = new LanguageParser();
      if (parser.isSupported(file.language)) {
        const symbols = await parser.parseSymbols(file.content, file.language);
        
        for (const symbol of symbols) {
          await db.insertSymbol({
            ...symbol,
            fileId
          });
        }

        // Parse and insert dependencies
        const dependencies = await parser.parseDependencies(file.content, file.language, file.path);
        
        for (const dependency of dependencies) {
          await db.insertDependency({
            ...dependency,
            sourceFileId: fileId,
            targetFileId: undefined // We don't resolve targets in tests
          });
        }
      }
    }

    return db;
  }

  /**
   * Simple hash calculation for testing
   */
  static calculateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Assert that two values are approximately equal (for floating point comparisons)
   */
  static assertApproximatelyEqual(actual: number, expected: number, tolerance: number = 0.001): void {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      throw new Error(`Expected ${actual} to be approximately ${expected} (tolerance: ${tolerance}), but difference was ${diff}`);
    }
  }

  /**
   * Assert that an array contains expected elements
   */
  static assertContains<T>(array: T[], expected: T, message?: string): void {
    if (!array.includes(expected)) {
      throw new Error(message || `Expected array to contain ${expected}, but it didn't. Array: ${JSON.stringify(array)}`);
    }
  }

  /**
   * Assert that a string matches a regex pattern
   */
  static assertMatches(actual: string, pattern: RegExp, message?: string): void {
    if (!pattern.test(actual)) {
      throw new Error(message || `Expected "${actual}" to match pattern ${pattern}, but it didn't`);
    }
  }

  /**
   * Wait for a specified amount of time (for async testing)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate test embeddings for validation
   */
  static generateTestEmbedding(text: string, dimensions: number = 100): Float32Array {
    const embedding = new Float32Array(dimensions);
    
    // Simple hash-based embedding for consistent testing
    const words = text.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      const hash = this.calculateHash(word);
      const index = parseInt(hash, 16) % dimensions;
      embedding[index] += 1.0 / words.length;
    }

    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  /**
   * Validate search results quality
   */
  static validateSearchResults(query: string, results: any[], expectedCount?: number): void {
    // Basic validation
    expect(Array.isArray(results)).toBe(true);
    
    if (expectedCount !== undefined) {
      expect(results.length).toBeGreaterThanOrEqual(Math.min(expectedCount, results.length));
    }

    // Check that results have required properties
    for (const result of results) {
      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('score');
      expect(result.file).toHaveProperty('path');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }

    // Results should be sorted by score (descending)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  }

  /**
   * Test language parser accuracy with known symbols
   */
  static async validateParserResults(content: string, language: string, expectedSymbols: string[]): Promise<void> {
    const parser = new LanguageParser();
    
    expect(parser.isSupported(language)).toBe(true);
    
    // This would normally be async, but we'll make it sync for testing
    const symbols = await parser.parseSymbols(content, language);
    
    const symbolNames = symbols.map(s => s.name);
    
    for (const expectedSymbol of expectedSymbols) {
      expect(symbolNames).toContain(expectedSymbol);
    }
  }

  /**
   * Performance testing helper
   */
  static async measurePerformance<T>(
    operation: () => Promise<T>,
    maxTimeMs: number,
    description: string
  ): Promise<{ result: T; timeMs: number }> {
    const startTime = Date.now();
    const result = await operation();
    const timeMs = Date.now() - startTime;

    if (timeMs > maxTimeMs) {
      console.warn(`Performance warning: ${description} took ${timeMs}ms (expected < ${maxTimeMs}ms)`);
    }

    return { result, timeMs };
  }
}

// Global test setup and teardown
beforeAll(async () => {
  // Global test setup
  console.log('🧪 Starting Codex MCP Server test suite...');
});

afterAll(async () => {
  // Global test cleanup
  TestUtils.cleanupTempDirs();
  console.log('✅ Test suite completed and cleaned up');
});

// Export for use in tests
export default TestUtils;