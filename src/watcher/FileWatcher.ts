import * as chokidar from 'chokidar';
import * as path from 'path';
import { CodeIndexer } from '../indexer/CodeIndexer.js';
import { Logger } from '../utils/Logger.js';

export interface WatcherOptions {
  ignored?: string[];
  persistent?: boolean;
  ignoreInitial?: boolean;
}

export class FileWatcher {
  private logger: Logger;
  private watcher: chokidar.FSWatcher | null = null;
  private repoPath: string;
  private indexer: CodeIndexer;
  private options: WatcherOptions;
  private isRunning = false;

  constructor(repoPath: string, indexer: CodeIndexer, options: WatcherOptions = {}) {
    this.logger = new Logger('FileWatcher');
    this.repoPath = repoPath;
    this.indexer = indexer;
    this.options = {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.min.js',
        '**/*.map',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/logs/**',
        '**/*.log',
        '**/.DS_Store',
        '**/Thumbs.db',
        ...(options.ignored || [])
      ],
      persistent: options.persistent ?? true,
      ignoreInitial: options.ignoreInitial ?? true
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('File watcher is already running');
      return;
    }

    try {
      this.logger.info(`Starting file watcher for: ${this.repoPath}`);

      const watchPatterns = [
        path.join(this.repoPath, '**/*.{js,jsx,ts,tsx,py,java,cpp,c,h,hpp,cs,php,rb,go,rs,swift,kt,scala,clj,hs,ml,fs,elm,dart,vue,svelte}'),
        path.join(this.repoPath, '**/*.{json,yaml,yml,xml,html,css,scss,sass,less,md,txt,cfg,ini,toml}')
      ];

      this.watcher = chokidar.watch(watchPatterns, {
        ignored: this.options.ignored,
        persistent: this.options.persistent,
        ignoreInitial: this.options.ignoreInitial,
        cwd: this.repoPath,
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100
        }
      });

      this.setupEventHandlers();
      this.isRunning = true;

      this.logger.info('File watcher started successfully');
    } catch (error) {
      this.logger.error('Failed to start file watcher:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.watcher) {
      this.logger.warn('File watcher is not running');
      return;
    }

    try {
      this.logger.info('Stopping file watcher...');
      
      await this.watcher.close();
      this.watcher = null;
      this.isRunning = false;
      
      this.logger.info('File watcher stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping file watcher:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.watcher) return;

    // File added
    this.watcher.on('add', async (filePath: string) => {
      await this.handleFileAdd(filePath);
    });

    // File changed
    this.watcher.on('change', async (filePath: string) => {
      await this.handleFileChange(filePath);
    });

    // File removed
    this.watcher.on('unlink', async (filePath: string) => {
      await this.handleFileRemove(filePath);
    });

    // Directory added
    this.watcher.on('addDir', (dirPath: string) => {
      this.logger.debug(`Directory added: ${dirPath}`);
    });

    // Directory removed
    this.watcher.on('unlinkDir', (dirPath: string) => {
      this.logger.debug(`Directory removed: ${dirPath}`);
    });

    // Watcher ready
    this.watcher.on('ready', () => {
      this.logger.info('File watcher is ready for changes');
    });

    // Watcher error
    this.watcher.on('error', (error) => {
      this.logger.error('File watcher error:', error);
    });

    // Raw events (for debugging)
    if (process.env.NODE_ENV === 'development') {
      this.watcher.on('raw', (event, path, details) => {
        this.logger.debug(`Raw event: ${event} on ${path}`, details);
      });
    }
  }

  private async handleFileAdd(filePath: string): Promise<void> {
    const absolutePath = path.resolve(this.repoPath, filePath);
    
    try {
      this.logger.debug(`File added: ${filePath}`);
      
      if (this.shouldIndexFile(filePath)) {
        await this.indexer.updateFile(absolutePath, this.repoPath);
        this.logger.info(`Indexed new file: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Error handling file add: ${filePath}`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    const absolutePath = path.resolve(this.repoPath, filePath);
    
    try {
      this.logger.debug(`File changed: ${filePath}`);
      
      if (this.shouldIndexFile(filePath)) {
        await this.indexer.updateFile(absolutePath, this.repoPath);
        this.logger.info(`Re-indexed changed file: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Error handling file change: ${filePath}`, error);
    }
  }

  private async handleFileRemove(filePath: string): Promise<void> {
    const absolutePath = path.resolve(this.repoPath, filePath);
    
    try {
      this.logger.debug(`File removed: ${filePath}`);
      
      await this.indexer.removeFile(absolutePath, this.repoPath);
      this.logger.info(`Removed file from index: ${filePath}`);
    } catch (error) {
      this.logger.error(`Error handling file remove: ${filePath}`, error);
    }
  }

  private shouldIndexFile(filePath: string): boolean {
    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    const supportedExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj',
      '.hs', '.ml', '.fs', '.elm', '.dart', '.vue', '.svelte',
      '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.sass',
      '.less', '.md', '.txt', '.cfg', '.ini', '.toml'
    ];

    if (!supportedExtensions.includes(ext)) {
      return false;
    }

    // Check if file is in ignored patterns
    for (const pattern of this.options.ignored || []) {
      const regex = this.globToRegex(pattern);
      if (regex.test(filePath)) {
        return false;
      }
    }

    return true;
  }

  private globToRegex(glob: string): RegExp {
    // Convert glob pattern to regex
    let regex = glob
      .replace(/\*\*/g, '.*')  // ** matches any number of directories
      .replace(/\*/g, '[^/]*') // * matches any characters except /
      .replace(/\?/g, '.')     // ? matches any single character
      .replace(/\./g, '\\.');  // Escape dots

    return new RegExp(`^${regex}$`);
  }

  // Utility methods

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getWatchedPaths(): string[] {
    if (!this.watcher) return [];
    return this.watcher.getWatched() as any; // Type assertion due to chokidar types
  }

  async pause(): Promise<void> {
    if (this.watcher && this.isRunning) {
      this.watcher.unwatch('*');
      this.logger.info('File watcher paused');
    }
  }

  async resume(): Promise<void> {
    if (this.watcher && this.isRunning) {
      // Re-add watch patterns
      const watchPatterns = [
        path.join(this.repoPath, '**/*.{js,jsx,ts,tsx,py,java,cpp,c,h,hpp,cs,php,rb,go,rs,swift,kt,scala,clj,hs,ml,fs,elm,dart,vue,svelte}'),
        path.join(this.repoPath, '**/*.{json,yaml,yml,xml,html,css,scss,sass,less,md,txt,cfg,ini,toml}')
      ];
      
      this.watcher.add(watchPatterns);
      this.logger.info('File watcher resumed');
    }
  }

  // Event emitter methods for external listeners
  onFileAdded(callback: (filePath: string) => void): void {
    if (this.watcher) {
      this.watcher.on('add', callback);
    }
  }

  onFileChanged(callback: (filePath: string) => void): void {
    if (this.watcher) {
      this.watcher.on('change', callback);
    }
  }

  onFileRemoved(callback: (filePath: string) => void): void {
    if (this.watcher) {
      this.watcher.on('unlink', callback);
    }
  }

  removeListener(event: string, callback: (...args: any[]) => void): void {
    if (this.watcher) {
      this.watcher.removeListener(event, callback);
    }
  }

  // Statistics and monitoring
  getStats(): {
    isRunning: boolean;
    watchedFiles: number;
    repoPath: string;
    options: WatcherOptions;
  } {
    return {
      isRunning: this.isRunning,
      watchedFiles: this.watcher ? Object.keys(this.watcher.getWatched()).length : 0,
      repoPath: this.repoPath,
      options: this.options
    };
  }
}