import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { DatabaseManager, FileRecord } from '../database/DatabaseManager.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { LanguageParser } from '../parsers/LanguageParser.js';
import { EmbeddingGenerator } from '../embeddings/EmbeddingGenerator.js';
import { Logger } from '../utils/Logger.js';
import glob from 'fast-glob';
import ignore from 'ignore';

export interface IndexingOptions {
  force?: boolean;
  fileExtensions?: string[];
  maxFileSize?: number;
  excludePatterns?: string[];
}

export class CodeIndexer {
  private logger: Logger;
  private database: DatabaseManager;
  private searchEngine: SearchEngine;
  private languageParser: LanguageParser;
  private embeddingGenerator: EmbeddingGenerator;
  private ignoreFilter: ReturnType<typeof ignore>;

  constructor(database: DatabaseManager, searchEngine: SearchEngine) {
    this.logger = new Logger('CodeIndexer');
    this.database = database;
    this.searchEngine = searchEngine;
    this.languageParser = new LanguageParser();
    this.embeddingGenerator = new EmbeddingGenerator();
    this.ignoreFilter = ignore();
    
    // Default ignore patterns
    this.ignoreFilter.add([
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.min.js',
      '*.map',
      'coverage/**',
      '.nyc_output/**',
      'logs/**',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ]);
  }

  async indexRepository(repoPath: string, force = false): Promise<void> {
    this.logger.info(`Starting repository indexing: ${repoPath}`);
    
    try {
      // Load .gitignore if exists
      await this.loadIgnoreFile(path.join(repoPath, '.gitignore'));
      
      // Find all code files
      const files = await this.findCodeFiles(repoPath);
      this.logger.info(`Found ${files.length} code files to process`);

      let processed = 0;
      let skipped = 0;
      let errors = 0;

      for (const filePath of files) {
        try {
          const shouldProcess = await this.shouldProcessFile(filePath, force);
          if (shouldProcess) {
            await this.indexFile(filePath, repoPath);
            processed++;
          } else {
            skipped++;
          }

          if ((processed + skipped + errors) % 100 === 0) {
            this.logger.info(`Progress: ${processed} processed, ${skipped} skipped, ${errors} errors`);
          }
        } catch (error) {
          this.logger.error(`Error indexing file ${filePath}:`, error);
          errors++;
        }
      }

      this.logger.info(`Indexing completed: ${processed} processed, ${skipped} skipped, ${errors} errors`);
    } catch (error) {
      this.logger.error('Repository indexing failed:', error);
      throw error;
    }
  }

  async indexFile(filePath: string, repoPath: string): Promise<void> {
    const relativePath = path.relative(repoPath, filePath);
    
    try {
      // Read file content
      const content = await fs.promises.readFile(filePath, 'utf8');
      const stats = await fs.promises.stat(filePath);
      
      // Calculate hash
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      // Determine language
      const language = this.languageParser.detectLanguage(filePath);
      
      // Create file record
      const fileRecord: Omit<FileRecord, 'id' | 'indexedAt'> = {
        path: relativePath,
        content,
        hash,
        size: stats.size,
        language,
        lastModified: stats.mtime
      };

      // Insert/update file record
      const fileId = await this.database.insertFile(fileRecord);
      
      // Clear existing symbols, dependencies, and embeddings
      await this.database.clearSymbolsByFile(fileId);
      await this.database.clearDependenciesByFile(fileId);
      await this.database.clearEmbeddingsByFile(fileId);

      // Parse and index symbols
      if (this.languageParser.isSupported(language)) {
        const symbols = await this.languageParser.parseSymbols(content, language);
        
        for (const symbol of symbols) {
          await this.database.insertSymbol({
            ...symbol,
            fileId
          });
        }

        // Parse dependencies
        const dependencies = await this.languageParser.parseDependencies(content, language, relativePath);
        
        for (const dependency of dependencies) {
          // Try to resolve target file
          const targetFileRecord = await this.database.getFile(dependency.importPath);
          
          await this.database.insertDependency({
            ...dependency,
            sourceFileId: fileId,
            targetFileId: targetFileRecord?.id
          });
        }
      }

      // Generate embeddings for the file
      await this.generateFileEmbeddings(fileId, content, language);

      this.logger.debug(`Successfully indexed: ${relativePath}`);
    } catch (error) {
      this.logger.error(`Failed to index file ${relativePath}:`, error);
      throw error;
    }
  }

  private async generateFileEmbeddings(fileId: number, content: string, language: string): Promise<void> {
    try {
      // Split content into chunks
      const chunks = this.splitIntoChunks(content, language);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding
        const embedding = await this.embeddingGenerator.generateEmbedding(chunk.content);
        
        // Store embedding
        await this.database.insertEmbedding({
          fileId,
          symbolId: chunk.symbolId,
          chunkIndex: i,
          content: chunk.content,
          embedding,
          metadata: {
            language,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            type: chunk.type
          }
        });
      }
    } catch (error) {
      this.logger.error(`Failed to generate embeddings for file ${fileId}:`, error);
      // Don't throw - embeddings are optional
    }
  }

  private splitIntoChunks(content: string, language: string): Array<{
    content: string;
    startLine: number;
    endLine: number;
    type: 'code' | 'comment' | 'docstring';
    symbolId?: number;
  }> {
    const lines = content.split('\n');
    const chunks: Array<{
      content: string;
      startLine: number;
      endLine: number;
      type: 'code' | 'comment' | 'docstring';
      symbolId?: number;
    }> = [];

    const maxChunkSize = 500; // characters
    let currentChunk = '';
    let chunkStartLine = 1;
    let currentLine = 1;

    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          startLine: chunkStartLine,
          endLine: currentLine - 1,
          type: 'code'
        });

        // Start new chunk
        currentChunk = line;
        chunkStartLine = currentLine;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
      
      currentLine++;
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        startLine: chunkStartLine,
        endLine: currentLine - 1,
        type: 'code'
      });
    }

    return chunks;
  }

  private async findCodeFiles(repoPath: string): Promise<string[]> {
    const patterns = [
      '**/*.{js,jsx,ts,tsx,py,java,cpp,c,h,hpp,cs,php,rb,go,rs,swift,kt,scala,clj,hs,ml,fs,elm,dart,vue,svelte}',
      '**/*.{json,yaml,yml,xml,html,css,scss,sass,less,md,txt,cfg,ini,toml}'
    ];

    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: repoPath,
        absolute: true,
        ignore: ['node_modules/**', '.git/**']
      });
      allFiles.push(...files);
    }

    // Remove duplicates and filter through ignore patterns
    const uniqueFiles = [...new Set(allFiles)];
    const filteredFiles = uniqueFiles.filter(file => {
      const relativePath = path.relative(repoPath, file);
      return !this.ignoreFilter.ignores(relativePath);
    });

    return filteredFiles;
  }

  private async shouldProcessFile(filePath: string, force: boolean): Promise<boolean> {
    if (force) return true;

    try {
      const stats = await fs.promises.stat(filePath);
      
      // Skip if file is too large (>1MB by default)
      if (stats.size > 1024 * 1024) {
        this.logger.debug(`Skipping large file: ${filePath} (${stats.size} bytes)`);
        return false;
      }

      // Check if file is already indexed and up to date
      const relativePath = path.relative(process.cwd(), filePath);
      const existingFile = await this.database.getFile(relativePath);
      
      if (existingFile && existingFile.lastModified >= stats.mtime) {
        return false; // File hasn't changed
      }

      return true;
    } catch (error) {
      this.logger.error(`Error checking file ${filePath}:`, error);
      return false;
    }
  }

  private async loadIgnoreFile(ignorePath: string): Promise<void> {
    try {
      if (await fs.promises.access(ignorePath).then(() => true, () => false)) {
        const ignoreContent = await fs.promises.readFile(ignorePath, 'utf8');
        this.ignoreFilter.add(ignoreContent);
        this.logger.debug(`Loaded ignore patterns from: ${ignorePath}`);
      }
    } catch (error) {
      this.logger.debug(`Could not load ignore file ${ignorePath}:`, error);
    }
  }

  async updateFile(filePath: string, repoPath: string): Promise<void> {
    this.logger.debug(`Updating file: ${filePath}`);
    await this.indexFile(filePath, repoPath);
  }

  async removeFile(filePath: string, repoPath: string): Promise<void> {
    const relativePath = path.relative(repoPath, filePath);
    this.logger.debug(`Removing file: ${relativePath}`);
    await this.database.deleteFile(relativePath);
  }
}