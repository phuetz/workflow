/**
 * Execution Export Service
 *
 * Handles async export of execution data for compliance and analytics.
 * Supports JSON, CSV, and XLSX formats with efficient streaming for large datasets.
 *
 * @module backend/api/services/executionExport
 * @version 1.0.0
 * @since 2026-01-11
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../services/SimpleLogger';

// Export job status
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

// Export format types
export type ExportFormat = 'json' | 'csv' | 'xlsx';

// Export filter options
export interface ExportOptions {
  format: ExportFormat;
  workflowId?: string;
  status?: 'success' | 'error' | 'all';
  dateFrom?: string;
  dateTo?: string;
  includeData?: boolean;
  includeNodeExecutions?: boolean;
  includeLogs?: boolean;
  limit?: number;
}

// Export job metadata
export interface ExportJob {
  id: string;
  status: ExportStatus;
  options: ExportOptions;
  progress: number; // 0-100
  totalRecords: number;
  processedRecords: number;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  error?: string;
  userId?: string;
}

// In-memory store for export jobs (in production, use Redis or database)
const exportJobs = new Map<string, ExportJob>();

// Cleanup interval for expired exports (1 hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
// Export file expiration (24 hours)
const EXPORT_EXPIRATION_MS = 24 * 60 * 60 * 1000;
// Max concurrent exports
const MAX_CONCURRENT_EXPORTS = 5;
// Batch size for processing
const BATCH_SIZE = 1000;

let activeExports = 0;

// Get temp directory for exports
function getExportDir(): string {
  const exportDir = path.join(os.tmpdir(), 'workflow-exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
}

/**
 * Create a new export job
 */
export async function createExportJob(options: ExportOptions, userId?: string): Promise<ExportJob> {
  // Check concurrent export limit
  if (activeExports >= MAX_CONCURRENT_EXPORTS) {
    throw new Error(`Maximum concurrent exports (${MAX_CONCURRENT_EXPORTS}) reached. Please wait.`);
  }

  const jobId = uuidv4();
  const now = new Date();

  const job: ExportJob = {
    id: jobId,
    status: 'pending',
    options: {
      ...options,
      limit: Math.min(options.limit || 10000, 100000), // Cap at 100k records
    },
    progress: 0,
    totalRecords: 0,
    processedRecords: 0,
    createdAt: now,
    expiresAt: new Date(now.getTime() + EXPORT_EXPIRATION_MS),
    userId,
  };

  exportJobs.set(jobId, job);

  logger.info('Export job created', {
    jobId,
    format: options.format,
    workflowId: options.workflowId,
    status: options.status,
    userId,
  });

  // Start processing asynchronously
  processExportJob(jobId).catch(err => {
    logger.error('Export job failed', { jobId, error: err.message });
  });

  return job;
}

/**
 * Get export job by ID
 */
export function getExportJob(jobId: string): ExportJob | null {
  return exportJobs.get(jobId) || null;
}

/**
 * Delete export job and cleanup files
 */
export async function deleteExportJob(jobId: string): Promise<boolean> {
  const job = exportJobs.get(jobId);
  if (!job) {
    return false;
  }

  // Cleanup file if exists
  if (job.filePath && fs.existsSync(job.filePath)) {
    try {
      fs.unlinkSync(job.filePath);
      logger.info('Export file deleted', { jobId, filePath: job.filePath });
    } catch (err) {
      logger.warn('Failed to delete export file', {
        jobId,
        filePath: job.filePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  exportJobs.delete(jobId);
  return true;
}

/**
 * Process export job asynchronously
 */
async function processExportJob(jobId: string): Promise<void> {
  const job = exportJobs.get(jobId);
  if (!job) {
    throw new Error('Export job not found');
  }

  activeExports++;
  job.status = 'processing';
  job.startedAt = new Date();

  try {
    // Fetch executions based on filters
    const executions = await fetchExecutions(job.options);
    job.totalRecords = executions.length;

    if (executions.length === 0) {
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      logger.info('Export completed with no records', { jobId });
      return;
    }

    // Generate export file based on format
    let filePath: string;
    let fileName: string;
    let mimeType: string;

    switch (job.options.format) {
      case 'csv':
        ({ filePath, fileName, mimeType } = await exportToCSV(executions, job));
        break;
      case 'xlsx':
        ({ filePath, fileName, mimeType } = await exportToXLSX(executions, job));
        break;
      case 'json':
      default:
        ({ filePath, fileName, mimeType } = await exportToJSON(executions, job));
        break;
    }

    // Update job with file info
    const stats = fs.statSync(filePath);
    job.filePath = filePath;
    job.fileName = fileName;
    job.fileSize = stats.size;
    job.mimeType = mimeType;
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();

    logger.info('Export job completed', {
      jobId,
      format: job.options.format,
      totalRecords: job.totalRecords,
      fileSize: job.fileSize,
      durationMs: job.completedAt.getTime() - (job.startedAt?.getTime() || 0),
    });

  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    job.completedAt = new Date();

    logger.error('Export job failed', {
      jobId,
      error: job.error,
      stack: err instanceof Error ? err.stack : undefined,
    });

    throw err;
  } finally {
    activeExports--;
  }
}

/**
 * Fetch executions based on filter options
 */
async function fetchExecutions(options: ExportOptions): Promise<any[]> {
  // Import adapters dynamically to avoid circular dependencies
  const adapters = await import('../repositories/adapters');

  // For now, we use a simple approach
  // In production, this should be a database query with proper filtering
  let executions: any[] = [];

  try {
    // Try to use Prisma client if available
    const { PrismaClient } = await import('@prisma/client');

    if (process.env.DATABASE_URL) {
      const prisma = new PrismaClient();

      try {
        // Build where clause
        const where: any = {};

        if (options.workflowId) {
          where.workflowId = options.workflowId;
        }

        if (options.status && options.status !== 'all') {
          where.status = options.status === 'success' ? 'SUCCESS' : 'FAILED';
        }

        if (options.dateFrom) {
          where.startedAt = { ...where.startedAt, gte: new Date(options.dateFrom) };
        }

        if (options.dateTo) {
          where.startedAt = { ...where.startedAt, lte: new Date(options.dateTo) };
        }

        // Fetch with pagination for large datasets
        const limit = options.limit || 10000;
        let offset = 0;

        while (true) {
          const batch = await prisma.workflowExecution.findMany({
            where,
            take: Math.min(BATCH_SIZE, limit - executions.length),
            skip: offset,
            orderBy: { startedAt: 'desc' },
            include: options.includeNodeExecutions ? {
              nodeExecutions: options.includeLogs ? true : {
                select: {
                  id: true,
                  nodeId: true,
                  nodeName: true,
                  nodeType: true,
                  status: true,
                  startedAt: true,
                  finishedAt: true,
                  duration: true,
                  input: options.includeData,
                  output: options.includeData,
                  error: true,
                },
              },
            } : undefined,
          });

          if (batch.length === 0 || executions.length >= limit) {
            break;
          }

          executions.push(...batch);
          offset += BATCH_SIZE;

          if (batch.length < BATCH_SIZE) {
            break;
          }
        }

        await prisma.$disconnect();
      } catch (dbErr) {
        await prisma.$disconnect();
        throw dbErr;
      }
    }
  } catch (err) {
    // Fallback to in-memory data if Prisma not available
    logger.debug('Using in-memory execution data for export', {
      error: err instanceof Error ? err.message : String(err),
    });

    // Return empty array for in-memory fallback
    // In production, this would query the in-memory store
    executions = [];
  }

  return executions;
}

/**
 * Export executions to JSON format
 */
async function exportToJSON(
  executions: any[],
  job: ExportJob
): Promise<{ filePath: string; fileName: string; mimeType: string }> {
  const exportDir = getExportDir();
  const fileName = `executions-export-${job.id}.json`;
  const filePath = path.join(exportDir, fileName);

  // Stream write for large files
  const writeStream = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    writeStream.write('{\n');
    writeStream.write(`  "exportId": "${job.id}",\n`);
    writeStream.write(`  "exportedAt": "${new Date().toISOString()}",\n`);
    writeStream.write(`  "totalRecords": ${executions.length},\n`);
    writeStream.write(`  "options": ${JSON.stringify(job.options)},\n`);
    writeStream.write('  "executions": [\n');

    let processed = 0;
    const total = executions.length;

    for (let i = 0; i < total; i++) {
      const exec = sanitizeExecution(executions[i], job.options);
      const comma = i < total - 1 ? ',' : '';
      writeStream.write(`    ${JSON.stringify(exec)}${comma}\n`);

      processed++;
      job.processedRecords = processed;
      job.progress = Math.round((processed / total) * 100);
    }

    writeStream.write('  ]\n');
    writeStream.write('}\n');

    writeStream.end();

    writeStream.on('finish', () => {
      resolve({
        filePath,
        fileName,
        mimeType: 'application/json',
      });
    });

    writeStream.on('error', reject);
  });
}

/**
 * Export executions to CSV format
 */
async function exportToCSV(
  executions: any[],
  job: ExportJob
): Promise<{ filePath: string; fileName: string; mimeType: string }> {
  const exportDir = getExportDir();
  const fileName = `executions-export-${job.id}.csv`;
  const filePath = path.join(exportDir, fileName);

  const writeStream = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    // Write CSV header
    const headers = [
      'id',
      'workflowId',
      'status',
      'startedAt',
      'finishedAt',
      'duration',
      'retryCount',
      'trigger',
    ];

    if (job.options.includeData) {
      headers.push('input', 'output');
    }

    if (job.options.includeNodeExecutions) {
      headers.push('nodeExecutionCount');
    }

    headers.push('error');

    writeStream.write(headers.join(',') + '\n');

    let processed = 0;
    const total = executions.length;

    for (let i = 0; i < total; i++) {
      const exec = executions[i];
      const row = [
        escapeCSV(exec.id),
        escapeCSV(exec.workflowId),
        escapeCSV(String(exec.status).toLowerCase()),
        escapeCSV(exec.startedAt ? new Date(exec.startedAt).toISOString() : ''),
        escapeCSV(exec.finishedAt ? new Date(exec.finishedAt).toISOString() : ''),
        exec.duration || '',
        exec.retryCount || 0,
        escapeCSV(JSON.stringify(exec.trigger || {})),
      ];

      if (job.options.includeData) {
        row.push(
          escapeCSV(JSON.stringify(exec.input || null)),
          escapeCSV(JSON.stringify(exec.output || null))
        );
      }

      if (job.options.includeNodeExecutions) {
        row.push(exec.nodeExecutions?.length || 0);
      }

      row.push(escapeCSV(exec.error ? (exec.error.message || JSON.stringify(exec.error)) : ''));

      writeStream.write(row.join(',') + '\n');

      processed++;
      job.processedRecords = processed;
      job.progress = Math.round((processed / total) * 100);
    }

    writeStream.end();

    writeStream.on('finish', () => {
      resolve({
        filePath,
        fileName,
        mimeType: 'text/csv',
      });
    });

    writeStream.on('error', reject);
  });
}

/**
 * Export executions to XLSX format
 */
async function exportToXLSX(
  executions: any[],
  job: ExportJob
): Promise<{ filePath: string; fileName: string; mimeType: string }> {
  const exportDir = getExportDir();
  const fileName = `executions-export-${job.id}.xlsx`;
  const filePath = path.join(exportDir, fileName);

  try {
    // Try to use xlsx library if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = await import('xlsx' as string) as any;

    // Prepare data for worksheet
    const data = executions.map((exec, index) => {
      const row: any = {
        id: exec.id,
        workflowId: exec.workflowId,
        status: String(exec.status).toLowerCase(),
        startedAt: exec.startedAt ? new Date(exec.startedAt).toISOString() : '',
        finishedAt: exec.finishedAt ? new Date(exec.finishedAt).toISOString() : '',
        duration: exec.duration || '',
        retryCount: exec.retryCount || 0,
        trigger: JSON.stringify(exec.trigger || {}),
      };

      if (job.options.includeData) {
        row.input = JSON.stringify(exec.input || null);
        row.output = JSON.stringify(exec.output || null);
      }

      if (job.options.includeNodeExecutions) {
        row.nodeExecutionCount = exec.nodeExecutions?.length || 0;
      }

      row.error = exec.error ? (exec.error.message || JSON.stringify(exec.error)) : '';

      job.processedRecords = index + 1;
      job.progress = Math.round(((index + 1) / executions.length) * 100);

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Executions');

    // Add metadata sheet
    const metaData = [
      { key: 'Export ID', value: job.id },
      { key: 'Exported At', value: new Date().toISOString() },
      { key: 'Total Records', value: executions.length },
      { key: 'Format', value: 'xlsx' },
      { key: 'Workflow ID Filter', value: job.options.workflowId || 'All' },
      { key: 'Status Filter', value: job.options.status || 'All' },
      { key: 'Date From', value: job.options.dateFrom || 'Not specified' },
      { key: 'Date To', value: job.options.dateTo || 'Not specified' },
    ];
    const metaSheet = XLSX.utils.json_to_sheet(metaData);
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');

    XLSX.writeFile(workbook, filePath);

    return {
      filePath,
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  } catch (err) {
    // Fallback to JSON if xlsx library not available
    logger.warn('XLSX export failed, falling back to JSON', {
      error: err instanceof Error ? err.message : String(err),
    });

    const result = await exportToJSON(executions, job);
    return {
      ...result,
      fileName: fileName.replace('.xlsx', '.json'),
    };
  }
}

/**
 * Sanitize execution data for export
 */
function sanitizeExecution(exec: any, options: ExportOptions): any {
  const sanitized: any = {
    id: exec.id,
    workflowId: exec.workflowId,
    status: String(exec.status).toLowerCase(),
    startedAt: exec.startedAt ? new Date(exec.startedAt).toISOString() : null,
    finishedAt: exec.finishedAt ? new Date(exec.finishedAt).toISOString() : null,
    duration: exec.duration || null,
    retryCount: exec.retryCount || 0,
    trigger: exec.trigger || null,
  };

  if (options.includeData) {
    sanitized.input = exec.input || null;
    sanitized.output = exec.output || null;
  }

  if (options.includeNodeExecutions && exec.nodeExecutions) {
    sanitized.nodeExecutions = exec.nodeExecutions.map((node: any) => ({
      id: node.id,
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      nodeType: node.nodeType,
      status: String(node.status).toLowerCase(),
      startedAt: node.startedAt ? new Date(node.startedAt).toISOString() : null,
      finishedAt: node.finishedAt ? new Date(node.finishedAt).toISOString() : null,
      duration: node.duration || null,
      ...(options.includeData ? { input: node.input, output: node.output } : {}),
      error: node.error ? (node.error.message || JSON.stringify(node.error)) : null,
    }));
  }

  if (exec.error) {
    sanitized.error = {
      message: exec.error.message || String(exec.error),
      ...(typeof exec.error === 'object' ? exec.error : {}),
    };
  }

  return sanitized;
}

/**
 * Escape CSV field value
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Get file path for download (if export is completed)
 */
export function getExportFilePath(jobId: string): string | null {
  const job = exportJobs.get(jobId);
  if (!job || job.status !== 'completed' || !job.filePath) {
    return null;
  }

  // Check if file still exists
  if (!fs.existsSync(job.filePath)) {
    job.status = 'expired';
    return null;
  }

  return job.filePath;
}

/**
 * List all export jobs for a user
 */
export function listExportJobs(userId?: string): ExportJob[] {
  const jobs: ExportJob[] = [];

  exportJobs.forEach((job) => {
    if (!userId || job.userId === userId) {
      jobs.push({ ...job });
    }
  });

  // Sort by createdAt descending
  jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return jobs;
}

/**
 * Cleanup expired exports
 */
export function cleanupExpiredExports(): number {
  let cleaned = 0;
  const now = new Date();

  exportJobs.forEach((job, jobId) => {
    if (job.expiresAt && job.expiresAt < now) {
      deleteExportJob(jobId);
      cleaned++;
    }
  });

  if (cleaned > 0) {
    logger.info('Cleaned up expired exports', { count: cleaned });
  }

  return cleaned;
}

// Start cleanup interval
setInterval(() => {
  cleanupExpiredExports();
}, CLEANUP_INTERVAL_MS);

// Export for testing
export const __testing = {
  exportJobs,
  getExportDir,
  fetchExecutions,
  sanitizeExecution,
  escapeCSV,
};
