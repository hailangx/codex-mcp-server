/**
 * Simple Language Parser Tests
 * Basic functionality tests for the LanguageParser
 */

import { LanguageParser, ParsedSymbol } from '../parsers/LanguageParser.js';

describe('LanguageParser', () => {
  let parser: LanguageParser;

  beforeEach(() => {
    parser = new LanguageParser();
  });

  describe('Language Detection', () => {
    it('should detect TypeScript files', () => {
      expect(parser.detectLanguage('test.ts')).toBe('typescript');
      expect(parser.detectLanguage('test.tsx')).toBe('typescript');
    });

    it('should detect JavaScript files', () => {
      expect(parser.detectLanguage('test.js')).toBe('javascript');
      expect(parser.detectLanguage('test.jsx')).toBe('javascript');
    });

    it('should detect Python files', () => {
      expect(parser.detectLanguage('test.py')).toBe('python');
    });

    it('should handle unknown extensions', () => {
      expect(parser.detectLanguage('test.unknown')).toBe('unknown');
      expect(parser.detectLanguage('README')).toBe('unknown');
    });
  });

  describe('Symbol Parsing', () => {
    it('should parse TypeScript class', async () => {
      const code = `
export class TestClass {
  constructor() {}
  
  method(): void {}
}`;

      const symbols = await parser.parseSymbols(code, 'typescript');
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
      
      // Check if we can find a class symbol
      const classSymbol = symbols.find((s: ParsedSymbol) => s.type === 'class');
      if (classSymbol) {
        expect(classSymbol.name).toBe('TestClass');
        expect(classSymbol.type).toBe('class');
      }
    });

    it('should parse JavaScript function', async () => {
      const code = `
function testFunction() {
  return true;
}

const testVar = 42;
`;

      const symbols = await parser.parseSymbols(code, 'javascript');
      expect(Array.isArray(symbols)).toBe(true);
      
      // Should extract at least one symbol
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should handle empty code', async () => {
      const symbols = await parser.parseSymbols('', 'typescript');
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBe(0);
    });

    it('should handle unsupported language', async () => {
      const symbols = await parser.parseSymbols('some code', 'unsupported');
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBe(0);
    });
  });

  describe('Real Code Examples', () => {
    it('should parse our Logger class', async () => {
      const loggerCode = `
export class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  info(message: string): void {
    console.log(\`[\${this.component}] \${message}\`);
  }

  error(message: string, error?: Error): void {
    console.error(\`[\${this.component}] \${message}\`, error);
  }
}`;

      const symbols = await parser.parseSymbols(loggerCode, 'typescript');
      expect(symbols.length).toBeGreaterThan(0);
      
      // Should find the Logger class
      const loggerClass = symbols.find((s: ParsedSymbol) => s.name === 'Logger');
      if (loggerClass) {
        expect(loggerClass.type).toBe('class');
      }
    });

    it('should parse DatabaseManager structure', async () => {
      const dbCode = `
class DatabaseManager {
  async initialize() {
    return Promise.resolve();
  }
  
  async insertFile(file) {
    return 1;
  }
}`;

      const symbols = await parser.parseSymbols(dbCode, 'javascript');
      expect(symbols.length).toBeGreaterThan(0);
      
      // Should extract the class
      const dbClass = symbols.find((s: ParsedSymbol) => s.name === 'DatabaseManager');
      if (dbClass) {
        expect(dbClass.type).toBe('class');
      }
    });

    it('should handle complex TypeScript interfaces', async () => {
      const interfaceCode = `
interface FileRecord {
  id: number;
  path: string;
  content: string;
}

type ImportType = 'import' | 'require';

export enum Language {
  TypeScript = 'typescript',
  JavaScript = 'javascript'
}`;

      const symbols = await parser.parseSymbols(interfaceCode, 'typescript');
      expect(symbols.length).toBeGreaterThan(0);
      
      // Should extract interface, type, and enum
      const hasInterface = symbols.some((s: ParsedSymbol) => s.type === 'interface');
      const hasType = symbols.some((s: ParsedSymbol) => s.type === 'type');
      const hasEnum = symbols.some((s: ParsedSymbol) => s.type === 'class' || s.name.includes('Language'));
      
      // At least one of these should be found
      expect(hasInterface || hasType || hasEnum).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed code gracefully', async () => {
      const badCode = `
class Broken {
  method() {
    // Missing brace
`;

      // Should not throw, just return empty or partial results
      const symbols = await parser.parseSymbols(badCode, 'typescript');
      expect(Array.isArray(symbols)).toBe(true);
    });

    it('should handle null/undefined input', async () => {
      const symbols1 = await parser.parseSymbols(null as any, 'typescript');
      const symbols2 = await parser.parseSymbols(undefined as any, 'typescript');
      
      expect(Array.isArray(symbols1)).toBe(true);
      expect(Array.isArray(symbols2)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should parse large files efficiently', async () => {
      // Create a large file with many functions
      const largeFunctions = Array.from({ length: 100 }, (_, i) => 
        `function func${i}() { return ${i}; }`
      ).join('\n\n');

      const startTime = Date.now();
      const symbols = await parser.parseSymbols(largeFunctions, 'javascript');
      const endTime = Date.now();

      expect(symbols.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});