import { Logger } from '../utils/Logger.js';

export interface EmbeddingOptions {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;
}

export class EmbeddingGenerator {
  private logger: Logger;
  private apiKey: string | null;
  private model: string;
  private dimensions: number;

  constructor(options: EmbeddingOptions = {}) {
    this.logger = new Logger('EmbeddingGenerator');
    this.apiKey = process.env.OPENAI_API_KEY || null;
    this.model = options.model || 'text-embedding-3-small';
    this.dimensions = options.dimensions || 1536;

    if (!this.apiKey) {
      this.logger.warn('No OpenAI API key found. Using local embeddings fallback.');
    }
  }

  async generateEmbedding(text: string): Promise<Float32Array> {
    try {
      if (this.apiKey) {
        return await this.generateOpenAIEmbedding(text);
      } else {
        return this.generateLocalEmbedding(text);
      }
    } catch (error) {
      this.logger.error('Embedding generation failed, falling back to local method:', error);
      return this.generateLocalEmbedding(text);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
    if (this.apiKey && texts.length > 1) {
      try {
        return await this.generateOpenAIBatchEmbeddings(texts);
      } catch (error) {
        this.logger.error('Batch embedding generation failed, falling back to individual calls:', error);
      }
    }

    // Fallback to individual generation
    const embeddings: Float32Array[] = [];
    for (const text of texts) {
      embeddings.push(await this.generateEmbedding(text));
    }
    return embeddings;
  }

  private async generateOpenAIEmbedding(text: string): Promise<Float32Array> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.substring(0, 8000), // OpenAI token limit
        model: this.model,
        dimensions: this.dimensions
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return new Float32Array(data.data[0].embedding);
  }

  private async generateOpenAIBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
    // Limit batch size to avoid API limits
    const batchSize = 100;
    const results: Float32Array[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize).map(text => text.substring(0, 8000));

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: batch,
          model: this.model,
          dimensions: this.dimensions
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> };
      for (const item of data.data) {
        results.push(new Float32Array(item.embedding));
      }
    }

    return results;
  }

  private generateLocalEmbedding(text: string): Float32Array {
    // Simple local embedding using TF-IDF-like approach
    // This is a fallback when OpenAI API is not available
    
    const words = this.tokenize(text);
    const wordCounts = new Map<string, number>();
    
    // Count word frequencies
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    // Create a simple hash-based embedding
    const embedding = new Float32Array(this.dimensions);
    
    for (const [word, count] of wordCounts) {
      const hash = this.hashString(word);
      
      // Use multiple hash functions to distribute features
      for (let i = 0; i < 3; i++) {
        const index = (hash + i * 17) % this.dimensions;
        const value = Math.log(1 + count) * Math.sin(hash * (i + 1));
        embedding[index] += value;
      }
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

  private tokenize(text: string): string[] {
    // Simple tokenization - convert to lowercase, remove punctuation, split on whitespace
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .slice(0, 1000); // Limit to prevent very large inputs
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Utility methods for similarity calculation
  public static cosineSimilarity(a: Float32Array, b: Float32Array): number {
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

  public static euclideanDistance(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  // Batch processing utilities
  async generateEmbeddingsForFiles(files: Array<{ path: string; content: string }>): Promise<Array<{ path: string; embedding: Float32Array }>> {
    const texts = files.map(f => f.content);
    const embeddings = await this.generateBatchEmbeddings(texts);

    return files.map((file, index) => ({
      path: file.path,
      embedding: embeddings[index]
    }));
  }

  // Text preprocessing for better embeddings
  preprocessCode(code: string, language: string): string {
    // Remove comments and normalize whitespace for better semantic understanding
    let processed = code;

    // Language-specific preprocessing
    switch (language) {
      case 'javascript':
      case 'typescript':
        // Remove single-line comments
        processed = processed.replace(/\/\/.*$/gm, '');
        // Remove multi-line comments
        processed = processed.replace(/\/\*[\s\S]*?\*\//g, '');
        break;
      
      case 'python':
        // Remove single-line comments
        processed = processed.replace(/#.*$/gm, '');
        // Keep docstrings as they're semantically important
        break;
      
      case 'java':
      case 'cpp':
      case 'c':
        // Remove single-line comments
        processed = processed.replace(/\/\/.*$/gm, '');
        // Remove multi-line comments
        processed = processed.replace(/\/\*[\s\S]*?\*\//g, '');
        break;
    }

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  }
}