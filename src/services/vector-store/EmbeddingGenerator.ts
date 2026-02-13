/**
 * Embedding Generator
 * Handles embedding generation using OpenAI or other providers
 */

import { logger } from '../SimpleLogger';

export class EmbeddingGenerator {
  private defaultModel = 'text-embedding-ada-002';
  private maxTextsPerRequest = 100;
  private maxTextLength = 8000;
  private timeoutMs = 30000;

  /**
   * Generate embeddings for an array of texts using OpenAI API
   */
  async generateEmbeddings(
    texts: string[],
    model: string = this.defaultModel
  ): Promise<number[][]> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required for OpenAI embeddings');
      }

      const validatedTexts = this.validateAndPrepareTexts(texts);
      return await this.callOpenAIEmbeddingsAPI(validatedTexts, model);
    } catch (error) {
      logger.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate and prepare texts for embedding
   */
  private validateAndPrepareTexts(texts: string[]): string[] {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Invalid input: texts must be a non-empty array');
    }

    if (texts.length > this.maxTextsPerRequest) {
      throw new Error(`Too many texts: maximum ${this.maxTextsPerRequest} allowed per request`);
    }

    const validatedTexts = texts
      .map((text) => {
        if (typeof text !== 'string') {
          throw new Error('Invalid input: all texts must be strings');
        }
        if (text.length > this.maxTextLength) {
          throw new Error(`Text too long: maximum ${this.maxTextLength} characters per text`);
        }
        return text.trim();
      })
      .filter((text) => text.length > 0);

    if (validatedTexts.length === 0) {
      throw new Error('No valid texts provided after validation');
    }

    return validatedTexts;
  }

  /**
   * Call OpenAI embeddings API with timeout and error handling
   */
  private async callOpenAIEmbeddingsAPI(
    texts: string[],
    model: string
  ): Promise<number[][]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WorkflowBuilder/1.0',
        },
        body: JSON.stringify({
          input: texts,
          model: model,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.handleAPIError(response.status);
      }

      return await this.parseEmbeddingsResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Handle API error responses
   */
  private handleAPIError(status: number): Error {
    if (status === 401) {
      return new Error('Authentication failed: invalid API key');
    } else if (status === 429) {
      return new Error('Rate limit exceeded: too many requests');
    } else if (status >= 500) {
      return new Error('OpenAI service temporarily unavailable');
    } else {
      return new Error(`Embedding generation failed: HTTP ${status}`);
    }
  }

  /**
   * Parse and validate the embeddings response
   */
  private async parseEmbeddingsResponse(response: Response): Promise<number[][]> {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid response structure from OpenAI API');
    }

    return data.data.map((item: unknown) => {
      if (!item || !Array.isArray((item as { embedding: unknown[] }).embedding)) {
        throw new Error('Invalid embedding data received from OpenAI API');
      }
      return (item as { embedding: number[] }).embedding;
    });
  }

  /**
   * Get configuration info
   */
  getConfig(): { defaultModel: string; maxTextsPerRequest: number; maxTextLength: number } {
    return {
      defaultModel: this.defaultModel,
      maxTextsPerRequest: this.maxTextsPerRequest,
      maxTextLength: this.maxTextLength,
    };
  }
}
