import { DatabaseManager, FileRecord, SymbolRecord, EmbeddingRecord, DependencyRecord } from '../database/DatabaseManager.js';
import { EmbeddingGenerator } from '../embeddings/EmbeddingGenerator.js';
import { Logger } from '../utils/Logger.js';

export interface SearchOptions {
  limit?: number;
  fileExtensions?: string[];
  threshold?: number;
}

export interface SearchResult {
  file: FileRecord;
  symbol?: SymbolRecord;
  score: number;
  snippet: string;
  line: number;
  matches: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface SymbolResult {
  symbol: SymbolRecord;
  file: FileRecord;
  score: number;
}

export interface ReferenceResult {
  file: FileRecord;
  line: number;
  column: number;
  context: string;
  type: 'definition' | 'usage' | 'import';
}

export interface DependencyGraph {
  file: FileRecord;
  dependencies: Array<{
    file?: FileRecord;
    importPath: string;
    type: string;
    symbols: string[];
    isExternal: boolean;
  }>;
  dependents: Array<{
    file: FileRecord;
    importPath: string;
    type: string;
    symbols: string[];
  }>;
}

export interface ContextResult {
  file: FileRecord;
  symbols: SymbolRecord[];
  relatedFiles: FileRecord[];
  dependencies: DependencyRecord[];
  relevantCode: Array<{
    content: string;
    startLine: number;
    endLine: number;
    score: number;
  }>;
}

export class SearchEngine {
  private logger: Logger;
  private database: DatabaseManager;
  private embeddingGenerator: EmbeddingGenerator;

  constructor(database: DatabaseManager) {
    this.logger = new Logger('SearchEngine');
    this.database = database;
    this.embeddingGenerator = new EmbeddingGenerator();
  }

  async searchCode(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 10, fileExtensions, threshold = 0.7 } = options;
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query);
      
      // Get all embeddings
      const embeddings = await this.database.getAllEmbeddings();
      
      // Calculate similarities
      const similarities = embeddings.map(embedding => ({
        embedding,
        score: this.cosineSimilarity(queryEmbedding, embedding.embedding)
      }));

      // Filter by threshold and sort by score
      const filteredSimilarities = similarities
        .filter(item => item.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit * 2); // Get more candidates for filtering

      // Get file records and build results
      const results: SearchResult[] = [];
      const fileCache = new Map<number, FileRecord>();

      for (const { embedding, score } of filteredSimilarities) {
        // Get file record
        let file = fileCache.get(embedding.fileId);
        if (!file) {
          const files = await this.database.getAllFiles();
          file = files.find(f => f.id === embedding.fileId);
          if (file) fileCache.set(embedding.fileId, file);
        }

        if (!file) continue;

        // Filter by file extension if specified
        if (fileExtensions && fileExtensions.length > 0) {
          const ext = this.getFileExtension(file.path);
          if (!fileExtensions.includes(ext)) continue;
        }

        // Get symbol if available
        let symbol: SymbolRecord | undefined;
        if (embedding.symbolId) {
          const symbols = await this.database.getSymbolsByFile(embedding.fileId);
          symbol = symbols.find(s => s.id === embedding.symbolId);
        }

        // Create search result
        const snippet = embedding.content.substring(0, 200) + (embedding.content.length > 200 ? '...' : '');
        const matches = this.findMatches(query, embedding.content);

        results.push({
          file,
          symbol,
          score,
          snippet,
          line: embedding.metadata?.startLine || 1,
          matches
        });

        if (results.length >= limit) break;
      }

      return results;
    } catch (error) {
      this.logger.error('Code search failed:', error);
      return [];
    }
  }

  async findSymbol(symbolName: string, symbolType?: string): Promise<SymbolResult[]> {
    try {
      const symbols = await this.database.findSymbolsByName(symbolName, symbolType);
      const results: SymbolResult[] = [];
      const fileCache = new Map<number, FileRecord>();

      for (const symbol of symbols) {
        // Get file record
        let file = fileCache.get(symbol.fileId);
        if (!file) {
          const files = await this.database.getAllFiles();
          file = files.find(f => f.id === symbol.fileId);
          if (file) fileCache.set(symbol.fileId, file);
        }

        if (!file) continue;

        // Calculate relevance score based on exact match and symbol type
        let score = symbolName === symbol.name ? 1.0 : 0.8;
        if (symbolType && symbolType === symbol.type) {
          score += 0.2;
        }

        results.push({
          symbol,
          file,
          score
        });
      }

      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      this.logger.error('Symbol search failed:', error);
      return [];
    }
  }

  async getReferences(symbolName: string, filePath?: string): Promise<ReferenceResult[]> {
    try {
      const results: ReferenceResult[] = [];
      
      // Find symbol definitions
      const symbols = await this.database.findSymbolsByName(symbolName);
      const fileCache = new Map<number, FileRecord>();

      for (const symbol of symbols) {
        // Get file record
        let file = fileCache.get(symbol.fileId);
        if (!file) {
          const files = await this.database.getAllFiles();
          file = files.find(f => f.id === symbol.fileId);
          if (file) fileCache.set(symbol.fileId, file);
        }

        if (!file) continue;

        // Filter by file path if specified
        if (filePath && file.path !== filePath) continue;

        // Add definition
        results.push({
          file,
          line: symbol.startLine,
          column: symbol.startColumn,
          context: symbol.definition.substring(0, 100) + (symbol.definition.length > 100 ? '...' : ''),
          type: 'definition'
        });
      }

      // Search for usages in all files using text search
      const allFiles = await this.database.getAllFiles();
      const symbolRegex = new RegExp(`\\b${symbolName}\\b`, 'g');

      for (const file of allFiles) {
        const lines = file.content.split('\n');
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          let match;
          
          while ((match = symbolRegex.exec(line)) !== null) {
            // Skip if this is the definition we already found
            const isDefinition = symbols.some(s => 
              s.fileId === file.id && 
              lineIndex + 1 >= s.startLine && 
              lineIndex + 1 <= s.endLine
            );

            if (!isDefinition) {
              results.push({
                file,
                line: lineIndex + 1,
                column: match.index + 1,
                context: line.trim(),
                type: 'usage'
              });
            }
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Reference search failed:', error);
      return [];
    }
  }

  async analyzeDependencies(filePath: string, depth: number = 2): Promise<DependencyGraph | null> {
    try {
      // Get file record
      const file = await this.database.getFile(filePath);
      if (!file) {
        this.logger.warn(`File not found: ${filePath}`);
        return null;
      }

      // Get direct dependencies
      const dependencies = await this.database.getDependenciesByFile(file.id!);
      const fileCache = new Map<number, FileRecord>();

      const dependencyList = await Promise.all(
        dependencies.map(async (dep) => {
          let targetFile: FileRecord | undefined;
          
          if (dep.targetFileId) {
            targetFile = fileCache.get(dep.targetFileId);
            if (!targetFile) {
              const files = await this.database.getAllFiles();
              targetFile = files.find(f => f.id === dep.targetFileId);
              if (targetFile) fileCache.set(dep.targetFileId, targetFile);
            }
          }

          return {
            file: targetFile,
            importPath: dep.importPath,
            type: dep.importType,
            symbols: dep.symbols,
            isExternal: dep.isExternal
          };
        })
      );

      // Find dependents (files that depend on this file)
      const allFiles = await this.database.getAllFiles();
      const dependents: Array<{
        file: FileRecord;
        importPath: string;
        type: string;
        symbols: string[];
      }> = [];

      for (const otherFile of allFiles) {
        if (otherFile.id === file.id) continue;

        const otherDeps = await this.database.getDependenciesByFile(otherFile.id!);
        for (const dep of otherDeps) {
          if (dep.targetFileId === file.id) {
            dependents.push({
              file: otherFile,
              importPath: dep.importPath,
              type: dep.importType,
              symbols: dep.symbols
            });
          }
        }
      }

      return {
        file,
        dependencies: dependencyList,
        dependents
      };
    } catch (error) {
      this.logger.error('Dependency analysis failed:', error);
      return null;
    }
  }

  async getContext(filePath: string, symbolName?: string, contextSize: number = 5): Promise<ContextResult | null> {
    try {
      // Get file record
      const file = await this.database.getFile(filePath);
      if (!file) {
        this.logger.warn(`File not found: ${filePath}`);
        return null;
      }

      // Get symbols in the file
      const symbols = await this.database.getSymbolsByFile(file.id!);
      
      // Filter symbols if specific symbol requested
      const relevantSymbols = symbolName 
        ? symbols.filter(s => s.name.includes(symbolName))
        : symbols;

      // Get dependencies
      const dependencies = await this.database.getDependenciesByFile(file.id!);

      // Get related files through dependencies
      const relatedFileIds = new Set<number>();
      for (const dep of dependencies) {
        if (dep.targetFileId) relatedFileIds.add(dep.targetFileId);
      }

      const allFiles = await this.database.getAllFiles();
      const relatedFiles = allFiles.filter(f => relatedFileIds.has(f.id!));

      // Get relevant code chunks using embeddings
      let relevantCode: Array<{
        content: string;
        startLine: number;
        endLine: number;
        score: number;
      }> = [];

      if (symbolName) {
        // Search for code related to the specific symbol
        const searchResults = await this.searchCode(symbolName, { limit: contextSize });
        
        relevantCode = searchResults
          .filter(result => result.file.id === file.id)
          .map(result => ({
            content: result.snippet,
            startLine: result.line,
            endLine: result.line + result.snippet.split('\n').length - 1,
            score: result.score
          }));
      } else {
        // Get embeddings for the file
        const embeddings = await this.database.getEmbeddingsByFile(file.id!);
        
        relevantCode = embeddings
          .slice(0, contextSize)
          .map(embedding => ({
            content: embedding.content,
            startLine: embedding.metadata?.startLine || 1,
            endLine: embedding.metadata?.endLine || 1,
            score: 1.0
          }));
      }

      return {
        file,
        symbols: relevantSymbols,
        relatedFiles,
        dependencies,
        relevantCode
      };
    } catch (error) {
      this.logger.error('Context retrieval failed:', error);
      return null;
    }
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }

  private findMatches(query: string, content: string): Array<{ start: number; end: number; text: string }> {
    const matches: Array<{ start: number; end: number; text: string }> = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    for (const word of queryWords) {
      if (word.length < 2) continue;

      let index = contentLower.indexOf(word);
      while (index !== -1) {
        matches.push({
          start: index,
          end: index + word.length,
          text: content.substring(index, index + word.length)
        });
        
        index = contentLower.indexOf(word, index + 1);
      }
    }

    return matches.sort((a, b) => a.start - b.start);
  }
}