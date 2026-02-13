/**
 * Dataset Preparer for Fine-Tuning
 * Handles dataset preparation, validation, formatting, and augmentation
 */

import { logger } from '../../services/SimpleLogger';
import type {
  TrainingExample,
  Dataset,
} from '../types/llmops';

export interface DatasetPreparationConfig {
  format: 'jsonl' | 'csv';
  validationSplit?: number; // 0-1
  testSplit?: number; // 0-1
  shuffle?: boolean;
  seed?: number;
  augmentation?: AugmentationConfig;
}

export interface AugmentationConfig {
  enabled: boolean;
  methods: ('paraphrase' | 'backtranslation' | 'synonym-replacement' | 'random-insertion')[];
  augmentationFactor: number; // Multiplier for dataset size
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: DatasetStats;
}

export interface ValidationError {
  type: 'missing-field' | 'invalid-format' | 'empty-content' | 'duplicate' | 'token-limit';
  message: string;
  exampleIndex?: number;
  field?: string;
}

export interface ValidationWarning {
  type: 'length-mismatch' | 'quality-issue' | 'imbalance';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DatasetStats {
  totalExamples: number;
  avgPromptLength: number;
  avgCompletionLength: number;
  minPromptLength: number;
  maxPromptLength: number;
  minCompletionLength: number;
  maxCompletionLength: number;
  tokenCount: number;
  totalTokens: number;
  avgTokensPerExample: number;
  uniquePrompts: number;
  duplicates: number;
}

export class DatasetPreparer {
  private readonly maxTokensPerExample = 8192;
  private readonly minExamplesRequired = 10;

  /**
   * Prepare dataset from raw training examples
   */
  async prepareDataset(
    examples: TrainingExample[],
    config: DatasetPreparationConfig
  ): Promise<Dataset> {
    logger.debug(`Preparing dataset with ${examples.length} examples...`);

    // Validate examples
    const validation = await this.validateExamples(examples);
    if (!validation.valid) {
      throw new Error(
        `Dataset validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Remove duplicates
    const uniqueExamples = this.removeDuplicates(examples);

    // Shuffle if requested
    let processedExamples = config.shuffle
      ? this.shuffle(uniqueExamples, config.seed)
      : uniqueExamples;

    // Apply augmentation if enabled
    if (config.augmentation?.enabled) {
      processedExamples = await this.augmentDataset(
        processedExamples,
        config.augmentation
      );
    }

    // Split dataset
    const split = this.splitDataset(
      processedExamples,
      config.validationSplit || 0.1,
      config.testSplit || 0.1
    );

    // Calculate statistics
    const stats = this.calculateStats(processedExamples);

    // Create dataset
    const dataset: Dataset = {
      id: this.generateDatasetId(),
      name: `dataset-${new Date().toISOString()}`,
      format: config.format,
      examples: processedExamples,
      stats,
      split,
      createdAt: new Date(),
    };

    logger.debug(`Dataset prepared: ${stats.totalExamples} examples, ${stats.totalTokens} tokens`);

    return dataset;
  }

  /**
   * Validate training examples
   */
  async validateExamples(examples: TrainingExample[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check minimum examples
    if (examples.length < this.minExamplesRequired) {
      errors.push({
        type: 'invalid-format',
        message: `Minimum ${this.minExamplesRequired} examples required, got ${examples.length}`,
      });
    }

    // Validate each example
    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];

      // Check required fields
      if (!example.prompt || example.prompt.trim() === '') {
        errors.push({
          type: 'missing-field',
          message: 'Prompt is required',
          exampleIndex: i,
          field: 'prompt',
        });
      }

      if (!example.completion || example.completion.trim() === '') {
        errors.push({
          type: 'missing-field',
          message: 'Completion is required',
          exampleIndex: i,
          field: 'completion',
        });
      }

      // Check token limits
      const tokens = this.estimateTokens(example.prompt + example.completion);
      if (tokens > this.maxTokensPerExample) {
        errors.push({
          type: 'token-limit',
          message: `Example exceeds token limit: ${tokens} > ${this.maxTokensPerExample}`,
          exampleIndex: i,
        });
      }

      // Check for quality issues
      if (example.prompt.length < 10) {
        warnings.push({
          type: 'quality-issue',
          message: `Very short prompt at index ${i}`,
          severity: 'medium',
        });
      }

      if (example.completion.length < 10) {
        warnings.push({
          type: 'quality-issue',
          message: `Very short completion at index ${i}`,
          severity: 'medium',
        });
      }
    }

    // Check for balance
    const avgPromptLength =
      examples.reduce((sum, e) => sum + e.prompt.length, 0) / examples.length;
    const avgCompletionLength =
      examples.reduce((sum, e) => sum + e.completion.length, 0) / examples.length;

    if (avgPromptLength / avgCompletionLength > 10 || avgCompletionLength / avgPromptLength > 10) {
      warnings.push({
        type: 'imbalance',
        message: 'Significant imbalance between prompt and completion lengths',
        severity: 'low',
      });
    }

    const stats = this.calculateStats(examples);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats,
    };
  }

  /**
   * Convert dataset to JSONL format
   */
  toJSONL(dataset: Dataset): string {
    return dataset.examples
      .map((example) =>
        JSON.stringify({
          prompt: example.prompt,
          completion: example.completion,
          metadata: example.metadata,
        })
      )
      .join('\n');
  }

  /**
   * Convert dataset to CSV format
   */
  toCSV(dataset: Dataset): string {
    const header = 'prompt,completion\n';
    const rows = dataset.examples
      .map((example) => {
        const prompt = this.escapeCsv(example.prompt);
        const completion = this.escapeCsv(example.completion);
        return `"${prompt}","${completion}"`;
      })
      .join('\n');

    return header + rows;
  }

  /**
   * Parse JSONL format
   */
  parseJSONL(content: string): TrainingExample[] {
    const lines = content.split('\n').filter((line) => line.trim());
    return lines.map((line) => {
      const obj = JSON.parse(line);
      return {
        prompt: obj.prompt,
        completion: obj.completion,
        metadata: obj.metadata,
      };
    });
  }

  /**
   * Parse CSV format
   */
  parseCSV(content: string): TrainingExample[] {
    const lines = content.split('\n').filter((line) => line.trim());
    const examples: TrainingExample[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const match = lines[i].match(/"([^"]*)","([^"]*)"/);
      if (match) {
        examples.push({
          prompt: match[1],
          completion: match[2],
        });
      }
    }

    return examples;
  }

  /**
   * Remove duplicate examples
   */
  private removeDuplicates(examples: TrainingExample[]): TrainingExample[] {
    const seen = new Set<string>();
    const unique: TrainingExample[] = [];

    for (const example of examples) {
      const key = `${example.prompt}|||${example.completion}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(example);
      }
    }

    logger.debug(`Removed ${examples.length - unique.length} duplicates`);
    return unique;
  }

  /**
   * Shuffle examples with optional seed
   */
  private shuffle(examples: TrainingExample[], seed?: number): TrainingExample[] {
    const shuffled = [...examples];
    const random = seed !== undefined ? this.seededRandom(seed) : Math.random;

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Split dataset into train/validation/test
   */
  private splitDataset(
    examples: TrainingExample[],
    validationSplit: number,
    testSplit: number
  ): {
    train: TrainingExample[];
    validation: TrainingExample[];
    test: TrainingExample[];
  } {
    const total = examples.length;
    const testSize = Math.floor(total * testSplit);
    const validationSize = Math.floor(total * validationSplit);
    const trainSize = total - testSize - validationSize;

    return {
      train: examples.slice(0, trainSize),
      validation: examples.slice(trainSize, trainSize + validationSize),
      test: examples.slice(trainSize + validationSize),
    };
  }

  /**
   * Augment dataset with synthetic examples
   */
  private async augmentDataset(
    examples: TrainingExample[],
    config: AugmentationConfig
  ): Promise<TrainingExample[]> {
    logger.debug(`Augmenting dataset with factor ${config.augmentationFactor}...`);

    const augmented = [...examples];
    const targetSize = Math.floor(examples.length * config.augmentationFactor);
    const toGenerate = targetSize - examples.length;

    for (let i = 0; i < toGenerate; i++) {
      const originalIndex = i % examples.length;
      const original = examples[originalIndex];

      // Apply random augmentation method
      const method = config.methods[Math.floor(Math.random() * config.methods.length)];
      const augmentedExample = await this.applyAugmentation(original, method);

      augmented.push(augmentedExample);
    }

    logger.debug(`Augmented dataset: ${examples.length} -> ${augmented.length} examples`);
    return augmented;
  }

  /**
   * Apply specific augmentation method
   */
  private async applyAugmentation(
    example: TrainingExample,
    method: string
  ): Promise<TrainingExample> {
    switch (method) {
      case 'paraphrase':
        return this.paraphrase(example);

      case 'synonym-replacement':
        return this.synonymReplacement(example);

      case 'random-insertion':
        return this.randomInsertion(example);

      case 'backtranslation':
        // Simplified - in production, use translation API
        return example;

      default:
        return example;
    }
  }

  /**
   * Paraphrase example (simplified version)
   */
  private paraphrase(example: TrainingExample): TrainingExample {
    // In production, use LLM for paraphrasing
    // This is a simplified version
    return {
      ...example,
      prompt: this.simpleParaphrase(example.prompt),
      metadata: {
        ...example.metadata,
        augmentation: 'paraphrase',
      },
    };
  }

  /**
   * Replace random words with synonyms
   */
  private synonymReplacement(example: TrainingExample): TrainingExample {
    const words = example.prompt.split(' ');
    const numReplacements = Math.floor(words.length * 0.1); // Replace 10%

    for (let i = 0; i < numReplacements; i++) {
      const idx = Math.floor(Math.random() * words.length);
      const synonym = this.getSynonym(words[idx]);
      if (synonym) {
        words[idx] = synonym;
      }
    }

    return {
      ...example,
      prompt: words.join(' '),
      metadata: {
        ...example.metadata,
        augmentation: 'synonym-replacement',
      },
    };
  }

  /**
   * Insert random words
   */
  private randomInsertion(example: TrainingExample): TrainingExample {
    const words = example.prompt.split(' ');
    const numInsertions = Math.floor(words.length * 0.05); // Insert 5%

    for (let i = 0; i < numInsertions; i++) {
      const idx = Math.floor(Math.random() * words.length);
      const randomWord = words[Math.floor(Math.random() * words.length)];
      words.splice(idx, 0, randomWord);
    }

    return {
      ...example,
      prompt: words.join(' '),
      metadata: {
        ...example.metadata,
        augmentation: 'random-insertion',
      },
    };
  }

  /**
   * Calculate dataset statistics
   */
  private calculateStats(examples: TrainingExample[]): DatasetStats {
    const promptLengths = examples.map((e) => e.prompt.length);
    const completionLengths = examples.map((e) => e.completion.length);

    const totalTokens = examples.reduce(
      (sum, e) => sum + this.estimateTokens(e.prompt + e.completion),
      0
    );

    const uniquePrompts = new Set(examples.map((e) => e.prompt)).size;

    return {
      totalExamples: examples.length,
      avgPromptLength: this.average(promptLengths),
      avgCompletionLength: this.average(completionLengths),
      minPromptLength: Math.min(...promptLengths),
      maxPromptLength: Math.max(...promptLengths),
      minCompletionLength: Math.min(...completionLengths),
      maxCompletionLength: Math.max(...completionLengths),
      tokenCount: totalTokens,
      totalTokens,
      avgTokensPerExample: totalTokens / examples.length,
      uniquePrompts,
      duplicates: examples.length - uniquePrompts,
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Escape CSV field
   */
  private escapeCsv(text: string): string {
    return text.replace(/"/g, '""');
  }

  /**
   * Simple paraphrasing (for demo purposes)
   */
  private simpleParaphrase(text: string): string {
    return text
      .replace(/\bhello\b/gi, 'hi')
      .replace(/\bhi\b/gi, 'hello')
      .replace(/\bthe\b/gi, 'a')
      .replace(/\ba\b/gi, 'the');
  }

  /**
   * Get synonym (simplified)
   */
  private getSynonym(word: string): string | null {
    const synonyms: Record<string, string[]> = {
      good: ['great', 'excellent', 'fine'],
      bad: ['poor', 'terrible', 'awful'],
      big: ['large', 'huge', 'massive'],
      small: ['tiny', 'little', 'mini'],
    };

    const lowerWord = word.toLowerCase();
    if (synonyms[lowerWord]) {
      const options = synonyms[lowerWord];
      return options[Math.floor(Math.random() * options.length)];
    }

    return null;
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * Calculate average
   */
  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Generate unique dataset ID
   */
  private generateDatasetId(): string {
    return `ds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
