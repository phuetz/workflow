/**
 * Batch Processor
 * Process items in batches with parallel execution (n8n-like)
 */

export interface BatchOptions {
  batchSize: number; // Number of items per batch
  parallel?: number; // Number of parallel batches
  delayBetweenBatches?: number; // Delay in ms between batches
  stopOnError?: boolean; // Stop processing on first error
  onBatchComplete?: (batchIndex: number, results: any[]) => void;
  onProgress?: (processed: number, total: number) => void;
}

export interface BatchResult<T> {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    item: any;
    result?: T;
    error?: string;
    batchIndex: number;
    itemIndex: number;
  }>;
  duration: number;
}

class BatchProcessor {
  /**
   * Process items in batches
   */
  async process<T>(
    items: any[],
    processor: (item: any, index: number) => Promise<T>,
    options: BatchOptions
  ): Promise<BatchResult<T>> {
    const startTime = Date.now();
    const results: BatchResult<T>['results'] = [];

    let processed = 0;
    let failed = 0;

    // Split into batches
    const batches = this.createBatches(items, options.batchSize);

    // Process batches
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        const batchResults = await this.processBatch(
          batch,
          processor,
          batchIndex,
          options.parallel || 1
        );

        // Collect results
        for (const result of batchResults) {
          results.push(result);

          if (result.error) {
            failed++;

            if (options.stopOnError) {
              return {
                success: false,
                processed,
                failed,
                results,
                duration: Date.now() - startTime
              };
            }
          } else {
            processed++;
          }
        }

        // Callback
        options.onBatchComplete?.(batchIndex, batchResults);
        options.onProgress?.(processed + failed, items.length);

        // Delay between batches
        if (batchIndex < batches.length - 1 && options.delayBetweenBatches) {
          await this.delay(options.delayBetweenBatches);
        }
      } catch (error) {
        failed += batch.length;

        if (options.stopOnError) {
          return {
            success: false,
            processed,
            failed,
            results,
            duration: Date.now() - startTime
          };
        }
      }
    }

    return {
      success: failed === 0,
      processed,
      failed,
      results,
      duration: Date.now() - startTime
    };
  }

  /**
   * Process a single batch with parallel execution
   */
  private async processBatch<T>(
    batch: Array<{ item: any; index: number }>,
    processor: (item: any, index: number) => Promise<T>,
    batchIndex: number,
    parallel: number
  ): Promise<BatchResult<T>['results']> {
    const results: BatchResult<T>['results'] = [];

    // Process in parallel chunks
    for (let i = 0; i < batch.length; i += parallel) {
      const chunk = batch.slice(i, i + parallel);

      const chunkResults = await Promise.all(
        chunk.map(async ({ item, index }) => {
          try {
            const result = await processor(item, index);
            return {
              item,
              result,
              batchIndex,
              itemIndex: index
            };
          } catch (error) {
            return {
              item,
              error: error instanceof Error ? error.message : String(error),
              batchIndex,
              itemIndex: index
            };
          }
        })
      );

      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Split items into batches
   */
  private createBatches<T>(items: T[], batchSize: number): Array<Array<{ item: T; index: number }>> {
    const batches: Array<Array<{ item: T; index: number }>> = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize).map((item, idx) => ({
        item,
        index: i + idx
      }));
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process with rate limiting
   */
  async processWithRateLimit<T>(
    items: any[],
    processor: (item: any) => Promise<T>,
    requestsPerSecond: number
  ): Promise<BatchResult<T>> {
    const delayMs = 1000 / requestsPerSecond;

    return this.process(items, processor, {
      batchSize: 1,
      parallel: 1,
      delayBetweenBatches: delayMs
    });
  }
}

// Singleton instance
export const batchProcessor = new BatchProcessor();

/**
 * Split In Batches Node Type (n8n-like)
 */
export const SplitInBatchesNodeType = {
  type: 'splitInBatches',
  category: 'Flow Control',
  label: 'Split In Batches',
  icon: '📦',
  color: '#f59e0b',
  description: 'Split items into batches for processing',
  inputs: [
    { name: 'items', type: 'array', required: true }
  ],
  outputs: [
    { name: 'batch', type: 'array' },
    { name: 'complete', type: 'any' }
  ],
  settings: [
    {
      key: 'batchSize',
      label: 'Batch Size',
      type: 'number',
      default: 10,
      validation: (value: number) => value > 0
    },
    {
      key: 'parallel',
      label: 'Parallel Batches',
      type: 'number',
      default: 1
    },
    {
      key: 'delayMs',
      label: 'Delay Between Batches (ms)',
      type: 'number',
      default: 0
    }
  ]
};

/**
 * Merge Node Type (n8n-like)
 */
export const MergeNodeType = {
  type: 'merge',
  category: 'Flow Control',
  label: 'Merge',
  icon: '🔀',
  color: '#8b5cf6',
  description: 'Merge data from multiple branches',
  inputs: [
    { name: 'input1', type: 'any', required: true },
    { name: 'input2', type: 'any', required: true }
  ],
  outputs: [
    { name: 'output', type: 'any' }
  ],
  settings: [
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      default: 'append',
      options: [
        { label: 'Append', value: 'append' },
        { label: 'Merge by Key', value: 'mergeByKey' },
        { label: 'Multiplex', value: 'multiplex' },
        { label: 'Combine', value: 'combine' }
      ]
    },
    {
      key: 'joinMode',
      label: 'Join Mode',
      type: 'select',
      default: 'inner',
      options: [
        { label: 'Inner Join', value: 'inner' },
        { label: 'Left Join', value: 'left' },
        { label: 'Outer Join', value: 'outer' }
      ]
    },
    {
      key: 'key',
      label: 'Join Key',
      type: 'text',
      default: 'id'
    }
  ],
  execute: async (config: any, inputs: any) => {
    const { input1, input2 } = inputs;
    const { mode, joinMode, key } = config;

    switch (mode) {
      case 'append':
        return [...(Array.isArray(input1) ? input1 : [input1]),
                ...(Array.isArray(input2) ? input2 : [input2])];

      case 'mergeByKey':
        return mergeByKey(input1, input2, key, joinMode);

      case 'multiplex':
        return multiplex(input1, input2);

      case 'combine':
        return { input1, input2 };

      default:
        return input1;
    }
  }
};

/**
 * Merge arrays by key
 */
function mergeByKey(arr1: any[], arr2: any[], key: string, joinMode: string): any[] {
  const map1 = new Map(arr1.map(item => [item[key], item]));
  const map2 = new Map(arr2.map(item => [item[key], item]));

  const result: any[] = [];

  switch (joinMode) {
    case 'inner':
      for (const [k, v1] of map1) {
        const v2 = map2.get(k);
        if (v2) {
          result.push({ ...v1, ...v2 });
        }
      }
      break;

    case 'left':
      for (const [k, v1] of map1) {
        const v2 = map2.get(k);
        result.push({ ...v1, ...(v2 || {}) });
      }
      break;

    case 'outer':
      const allKeys = new Set([...map1.keys(), ...map2.keys()]);
      for (const k of allKeys) {
        const v1 = map1.get(k) || {};
        const v2 = map2.get(k) || {};
        result.push({ ...v1, ...v2 });
      }
      break;
  }

  return result;
}

/**
 * Multiplex - combine each item from arr1 with each item from arr2
 */
function multiplex(arr1: any[], arr2: any[]): any[] {
  const result: any[] = [];

  for (const item1 of arr1) {
    for (const item2 of arr2) {
      result.push({ ...item1, ...item2 });
    }
  }

  return result;
}
