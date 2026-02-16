/**
 * Binary Data Service
 * Stores and retrieves binary data for workflow execution (files, images, etc.)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import type { BinaryDataReference } from './nodeExecutors/types';

const BASE_DIR = path.join(os.tmpdir(), 'workflow-binary');

class BinaryDataService {
  /**
   * Store binary data and return a reference
   */
  store(
    data: Buffer,
    metadata: { executionId: string; fileName: string; mimeType: string }
  ): BinaryDataReference {
    const id = crypto.randomUUID();
    const dir = path.join(BASE_DIR, metadata.executionId);
    fs.mkdirSync(dir, { recursive: true });

    const storagePath = path.join(dir, id);
    fs.writeFileSync(storagePath, data);

    return {
      id,
      fileName: metadata.fileName,
      mimeType: metadata.mimeType,
      size: data.length,
      storagePath,
    };
  }

  /**
   * Retrieve binary data by reference
   */
  retrieve(ref: BinaryDataReference): Buffer {
    if (!fs.existsSync(ref.storagePath)) {
      throw new Error(`Binary data not found: ${ref.storagePath}`);
    }
    return fs.readFileSync(ref.storagePath);
  }

  /**
   * Cleanup all binary data for an execution
   */
  cleanup(executionId: string): void {
    const dir = path.join(BASE_DIR, executionId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

export const binaryDataService = new BinaryDataService();
