import * as path from 'path';
import { SymbolRecord, DependencyRecord } from '../database/DatabaseManager.js';
import { Logger } from '../utils/Logger.js';

export interface ParsedSymbol {
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

export interface ParsedDependency {
  importPath: string;
  importType: 'import' | 'require' | 'include';
  isExternal: boolean;
  symbols: string[];
}

export class LanguageParser {
  private logger: Logger;
  private supportedLanguages = new Set([
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'clojure'
  ]);

  constructor() {
    this.logger = new Logger('LanguageParser');
  }

  detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.pyw': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.cxx': 'cpp',
      '.cc': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.clj': 'clojure',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.md': 'markdown'
    };

    return languageMap[ext] || 'unknown';
  }

  isSupported(language: string): boolean {
    return this.supportedLanguages.has(language);
  }

  async parseSymbols(content: string, language: string): Promise<ParsedSymbol[]> {
    // Handle null/undefined content
    if (!content) {
      return [];
    }

    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.parseJavaScriptSymbols(content);
      case 'python':
        return this.parsePythonSymbols(content);
      case 'java':
        return this.parseJavaSymbols(content);
      case 'cpp':
      case 'c':
        return this.parseCppSymbols(content);
      default:
        this.logger.debug(`Unsupported language for symbol parsing: ${language}`);
        return [];
    }
  }

  async parseDependencies(content: string, language: string, filePath: string): Promise<ParsedDependency[]> {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.parseJavaScriptDependencies(content);
      case 'python':
        return this.parsePythonDependencies(content);
      case 'java':
        return this.parseJavaDependencies(content);
      default:
        this.logger.debug(`Unsupported language for dependency parsing: ${language}`);
        return [];
    }
  }

  private parseJavaScriptSymbols(content: string): ParsedSymbol[] {
    const symbols: ParsedSymbol[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Function declarations
      const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
      if (functionMatch) {
        const name = functionMatch[1];
        const definition = this.getDefinition(lines, i, 'function');
        symbols.push({
          name,
          type: 'function',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf('function') + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractModifiers(line)
        });
      }

      // Arrow functions
      const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
      if (arrowMatch) {
        const name = arrowMatch[1];
        const definition = this.getDefinition(lines, i, 'arrow');
        symbols.push({
          name,
          type: 'function',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}') || lineNumber,
          startColumn: line.indexOf(name) + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractModifiers(line)
        });
      }

      // Class declarations
      const classMatch = line.match(/(?:export\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch) {
        const name = classMatch[1];
        const definition = this.getDefinition(lines, i, 'class');
        symbols.push({
          name,
          type: 'class',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf('class') + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractModifiers(line)
        });
      }

      // Interface declarations (TypeScript)
      const interfaceMatch = line.match(/(?:export\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (interfaceMatch) {
        const name = interfaceMatch[1];
        const definition = this.getDefinition(lines, i, 'interface');
        symbols.push({
          name,
          type: 'interface',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf('interface') + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractModifiers(line)
        });
      }

      // Type aliases (TypeScript)
      const typeMatch = line.match(/(?:export\s+)?type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
      if (typeMatch) {
        const name = typeMatch[1];
        symbols.push({
          name,
          type: 'type',
          startLine: lineNumber,
          endLine: lineNumber,
          startColumn: line.indexOf('type') + 1,
          endColumn: line.length + 1,
          definition: line.trim(),
          modifiers: this.extractModifiers(line)
        });
      }

      // Variable declarations
      const varMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (varMatch && !arrowMatch) { // Exclude arrow functions
        const name = varMatch[1];
        symbols.push({
          name,
          type: 'variable',
          startLine: lineNumber,
          endLine: lineNumber,
          startColumn: line.indexOf(name) + 1,
          endColumn: line.length + 1,
          definition: line.trim(),
          modifiers: this.extractModifiers(line)
        });
      }

      // Method declarations within classes
      const methodMatch = line.match(/^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[:{]/);
      if (methodMatch && this.isInsideClass(lines, i)) {
        const name = methodMatch[1];
        const definition = this.getDefinition(lines, i, 'method');
        symbols.push({
          name,
          type: 'method',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf(name) + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractModifiers(line)
        });
      }
    }

    return symbols;
  }

  private parsePythonSymbols(content: string): ParsedSymbol[] {
    const symbols: ParsedSymbol[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Function definitions
      const functionMatch = line.match(/^(\s*)def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (functionMatch) {
        const name = functionMatch[2];
        const indent = functionMatch[1].length;
        const definition = this.getDefinition(lines, i, 'def');
        const docstring = this.extractPythonDocstring(lines, i + 1);
        
        symbols.push({
          name,
          type: 'function',
          startLine: lineNumber,
          endLine: this.findPythonBlockEnd(lines, i, indent),
          startColumn: line.indexOf('def') + 1,
          endColumn: line.length + 1,
          definition,
          docstring,
          modifiers: this.extractPythonDecorators(lines, i)
        });
      }

      // Class definitions
      const classMatch = line.match(/^(\s*)class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (classMatch) {
        const name = classMatch[2];
        const indent = classMatch[1].length;
        const definition = this.getDefinition(lines, i, 'class');
        const docstring = this.extractPythonDocstring(lines, i + 1);

        symbols.push({
          name,
          type: 'class',
          startLine: lineNumber,
          endLine: this.findPythonBlockEnd(lines, i, indent),
          startColumn: line.indexOf('class') + 1,
          endColumn: line.length + 1,
          definition,
          docstring,
          modifiers: this.extractPythonDecorators(lines, i)
        });
      }

      // Variable assignments (global level)
      const varMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
      if (varMatch && !line.includes('def ') && !line.includes('class ')) {
        const name = varMatch[1];
        symbols.push({
          name,
          type: 'variable',
          startLine: lineNumber,
          endLine: lineNumber,
          startColumn: 1,
          endColumn: line.length + 1,
          definition: line.trim(),
          modifiers: []
        });
      }
    }

    return symbols;
  }

  private parseJavaSymbols(content: string): ParsedSymbol[] {
    const symbols: ParsedSymbol[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Class declarations
      const classMatch = line.match(/(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch) {
        const name = classMatch[1];
        const definition = this.getDefinition(lines, i, 'class');
        symbols.push({
          name,
          type: 'class',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf('class') + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractJavaModifiers(line)
        });
      }

      // Method declarations
      const methodMatch = line.match(/(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?[a-zA-Z_$<>[\]]+\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
      if (methodMatch && !line.includes('class ')) {
        const name = methodMatch[1];
        const definition = this.getDefinition(lines, i, 'method');
        symbols.push({
          name,
          type: 'method',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf(name) + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractJavaModifiers(line)
        });
      }

      // Interface declarations
      const interfaceMatch = line.match(/(?:public\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (interfaceMatch) {
        const name = interfaceMatch[1];
        const definition = this.getDefinition(lines, i, 'interface');
        symbols.push({
          name,
          type: 'interface',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf('interface') + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractJavaModifiers(line)
        });
      }
    }

    return symbols;
  }

  private parseCppSymbols(content: string): ParsedSymbol[] {
    const symbols: ParsedSymbol[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Function declarations/definitions
      const functionMatch = line.match(/^(?:inline\s+|static\s+|extern\s+)?(?:const\s+)?[a-zA-Z_*&:<>[\]\s]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)/);
      if (functionMatch && !line.includes('class ') && !line.includes('struct ')) {
        const name = functionMatch[1];
        const definition = this.getDefinition(lines, i, 'function');
        symbols.push({
          name,
          type: 'function',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}') || lineNumber,
          startColumn: line.indexOf(name) + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractCppModifiers(line)
        });
      }

      // Class declarations
      const classMatch = line.match(/(?:template\s*<[^>]*>\s*)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (classMatch) {
        const name = classMatch[1];
        const definition = this.getDefinition(lines, i, 'class');
        symbols.push({
          name,
          type: 'class',
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf('class') + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractCppModifiers(line)
        });
      }

      // Struct declarations
      const structMatch = line.match(/(?:template\s*<[^>]*>\s*)?struct\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (structMatch) {
        const name = structMatch[1];
        const definition = this.getDefinition(lines, i, 'struct');
        symbols.push({
          name,
          type: 'class', // Treat struct as class
          startLine: lineNumber,
          endLine: this.findEndLine(lines, i, '{', '}'),
          startColumn: line.indexOf('struct') + 1,
          endColumn: line.length + 1,
          definition,
          modifiers: this.extractCppModifiers(line)
        });
      }
    }

    return symbols;
  }

  private parseJavaScriptDependencies(content: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // ES6 imports
      const importMatch = line.match(/import\s+(?:(.+?)\s+from\s+)?['"](.*?)['"];?/);
      if (importMatch) {
        const importPath = importMatch[2];
        const isExternal = !importPath.startsWith('.') && !importPath.startsWith('/');
        
        // Extract imported symbols
        const symbols: string[] = [];
        if (importMatch[1]) {
          const importClause = importMatch[1].trim();
          if (importClause.includes('{')) {
            // Named imports: { symbol1, symbol2 }
            const namedImports = importClause.match(/\{([^}]+)\}/);
            if (namedImports) {
              symbols.push(...namedImports[1].split(',').map(s => s.trim().split(' as ')[0]));
            }
          } else if (!importClause.includes('*')) {
            // Default import
            symbols.push(importClause);
          }
        }

        dependencies.push({
          importPath,
          importType: 'import',
          isExternal,
          symbols
        });
      }

      // CommonJS require
      const requireMatch = line.match(/(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(\s*['"](.*?)['"]?\s*\)/);
      if (requireMatch) {
        const importPath = requireMatch[2];
        const isExternal = !importPath.startsWith('.') && !importPath.startsWith('/');
        
        // Extract required symbols
        const symbols: string[] = [];
        const varPart = requireMatch[1].trim();
        if (varPart.includes('{')) {
          // Destructured require: { symbol1, symbol2 }
          const destructured = varPart.match(/\{([^}]+)\}/);
          if (destructured) {
            symbols.push(...destructured[1].split(',').map(s => s.trim()));
          }
        } else {
          symbols.push(varPart);
        }

        dependencies.push({
          importPath,
          importType: 'require',
          isExternal,
          symbols
        });
      }
    }

    return dependencies;
  }

  private parsePythonDependencies(content: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // import module
      const importMatch = line.match(/^import\s+([a-zA-Z_][a-zA-Z0-9_.]*)(?:\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*))?/);
      if (importMatch) {
        const importPath = importMatch[1];
        const alias = importMatch[2];
        const isExternal = !importPath.startsWith('.');
        
        dependencies.push({
          importPath,
          importType: 'import',
          isExternal,
          symbols: alias ? [alias] : [importPath.split('.').pop() || importPath]
        });
      }

      // from module import symbols
      const fromImportMatch = line.match(/^from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import\s+(.+)/);
      if (fromImportMatch) {
        const importPath = fromImportMatch[1];
        const importedItems = fromImportMatch[2];
        const isExternal = !importPath.startsWith('.');
        
        const symbols: string[] = [];
        if (importedItems.includes(',')) {
          symbols.push(...importedItems.split(',').map(s => s.trim().split(' as ')[0]));
        } else {
          symbols.push(importedItems.trim().split(' as ')[0]);
        }

        dependencies.push({
          importPath,
          importType: 'import',
          isExternal,
          symbols
        });
      }
    }

    return dependencies;
  }

  private parseJavaDependencies(content: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // import statements
      const importMatch = line.match(/^import\s+(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_.]*(?:\.\*)?);?/);
      if (importMatch) {
        const importPath = importMatch[1];
        const isExternal = !importPath.startsWith(this.getCurrentPackage(content));
        
        const symbols: string[] = [];
        if (importPath.endsWith('.*')) {
          // Wildcard import
          symbols.push('*');
        } else {
          // Specific class import
          symbols.push(importPath.split('.').pop() || importPath);
        }

        dependencies.push({
          importPath,
          importType: 'import',
          isExternal,
          symbols
        });
      }
    }

    return dependencies;
  }

  // Helper methods

  private getDefinition(lines: string[], startIndex: number, type: string): string {
    const maxLines = 5;
    const endIndex = Math.min(startIndex + maxLines, lines.length);
    return lines.slice(startIndex, endIndex).join('\n').trim();
  }

  private findEndLine(lines: string[], startIndex: number, openChar: string, closeChar: string): number {
    let depth = 0;
    let found = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === openChar) {
          depth++;
          found = true;
        } else if (char === closeChar) {
          depth--;
          if (found && depth === 0) {
            return i + 1;
          }
        }
      }
    }

    return startIndex + 1;
  }

  private findPythonBlockEnd(lines: string[], startIndex: number, baseIndent: number): number {
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue; // Skip empty lines
      
      const indent = line.length - line.trimStart().length;
      if (indent <= baseIndent && line.trim() !== '') {
        return i;
      }
    }
    return lines.length;
  }

  private extractModifiers(line: string): string[] {
    const modifiers: string[] = [];
    const modifierKeywords = ['export', 'default', 'async', 'static', 'const', 'let', 'var'];
    
    for (const keyword of modifierKeywords) {
      if (line.includes(keyword)) {
        modifiers.push(keyword);
      }
    }
    
    return modifiers;
  }

  private extractJavaModifiers(line: string): string[] {
    const modifiers: string[] = [];
    const javaModifiers = ['public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized'];
    
    for (const modifier of javaModifiers) {
      if (new RegExp(`\\b${modifier}\\b`).test(line)) {
        modifiers.push(modifier);
      }
    }
    
    return modifiers;
  }

  private extractCppModifiers(line: string): string[] {
    const modifiers: string[] = [];
    const cppModifiers = ['static', 'extern', 'inline', 'const', 'virtual', 'override'];
    
    for (const modifier of cppModifiers) {
      if (new RegExp(`\\b${modifier}\\b`).test(line)) {
        modifiers.push(modifier);
      }
    }
    
    return modifiers;
  }

  private extractPythonDecorators(lines: string[], functionIndex: number): string[] {
    const decorators: string[] = [];
    
    for (let i = functionIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('@')) {
        decorators.unshift(line);
      } else if (line !== '') {
        break;
      }
    }
    
    return decorators;
  }

  private extractPythonDocstring(lines: string[], startIndex: number): string | undefined {
    if (startIndex >= lines.length) return undefined;
    
    const line = lines[startIndex].trim();
    if (line.startsWith('"""') || line.startsWith("'''")) {
      const quote = line.substring(0, 3);
      let docstring = line.substring(3);
      
      if (line.endsWith(quote) && line.length > 6) {
        // Single line docstring
        return docstring.substring(0, docstring.length - 3);
      }
      
      // Multi-line docstring
      for (let i = startIndex + 1; i < lines.length; i++) {
        const nextLine = lines[i];
        if (nextLine.includes(quote)) {
          docstring += '\n' + nextLine.substring(0, nextLine.indexOf(quote));
          break;
        }
        docstring += '\n' + nextLine;
      }
      
      return docstring.trim();
    }
    
    return undefined;
  }

  private isInsideClass(lines: string[], currentIndex: number): boolean {
    // Simple heuristic to check if we're inside a class
    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('class ') && line.includes('{')) {
        return true;
      }
      if (line === '}' || line.startsWith('function ')) {
        return false;
      }
    }
    return false;
  }

  private getCurrentPackage(content: string): string {
    const packageMatch = content.match(/^package\s+([a-zA-Z_][a-zA-Z0-9_.]*);?/m);
    return packageMatch ? packageMatch[1] : '';
  }
}