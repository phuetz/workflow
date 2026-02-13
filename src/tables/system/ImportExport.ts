/**
 * Import/Export Manager - Data import and export operations
 */

import { logger } from '../../services/SimpleLogger';
import type {
  Table,
  Row,
  ExportFormat,
  ImportFormat,
  BulkOperation,
  OperationError
} from './types';

export interface ExportOptions {
  format: ExportFormat;
  columns?: string[];
  includeHeaders?: boolean;
  includeMetadata?: boolean;
  delimiter?: string;
  encoding?: string;
}

export interface ImportOptions {
  format: ImportFormat;
  columnMapping?: Record<string, string>;
  skipRows?: number;
  validateOnly?: boolean;
  onError?: 'skip' | 'stop' | 'include';
}

export interface ExportResult {
  data: string | Buffer;
  format: ExportFormat;
  rowCount: number;
  metadata?: Record<string, any>;
}

export interface ImportResult {
  success: boolean;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  errors: OperationError[];
}

export class ImportExportManager {
  /**
   * Export table data to specified format
   */
  async exportData(
    table: Table,
    rows: Row[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const { format } = options;
    const columns = options.columns || table.schema.columns.map(c => c.name);

    switch (format) {
      case 'csv':
        return this.exportToCSV(table, rows, columns, options);
      case 'json':
        return this.exportToJSON(table, rows, columns, options);
      case 'excel':
        return this.exportToExcel(table, rows, columns, options);
      case 'xml':
        return this.exportToXML(table, rows, columns, options);
      case 'parquet':
        return this.exportToParquet(table, rows, columns, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import data from specified format
   */
  async importData(
    table: Table,
    data: string | Buffer,
    options: ImportOptions,
    createRowFn: (data: any) => Promise<Row>
  ): Promise<ImportResult> {
    const { format } = options;

    let parsedData: any[];

    switch (format) {
      case 'csv':
        parsedData = this.parseCSV(data, options);
        break;
      case 'json':
        parsedData = this.parseJSON(data, options);
        break;
      case 'excel':
        parsedData = this.parseExcel(data, options);
        break;
      case 'xml':
        parsedData = this.parseXML(data, options);
        break;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    // Apply column mapping
    if (options.columnMapping) {
      parsedData = parsedData.map(row => {
        const mapped: any = {};
        for (const [source, target] of Object.entries(options.columnMapping!)) {
          if (row[source] !== undefined) {
            mapped[target] = row[source];
          }
        }
        return mapped;
      });
    }

    // Check max rows
    if (parsedData.length > table.settings.import.maxRows) {
      throw new Error(`Import exceeds maximum row limit (${table.settings.import.maxRows})`);
    }

    // Validate only mode
    if (options.validateOnly) {
      return this.validateImportData(table, parsedData);
    }

    // Import rows
    return this.importRows(table, parsedData, options, createRowFn);
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(
    _table: Table,
    rows: Row[],
    columns: string[],
    options: ExportOptions
  ): ExportResult {
    const delimiter = options.delimiter || ',';
    const lines: string[] = [];

    // Add headers
    if (options.includeHeaders !== false) {
      lines.push(columns.map(c => this.escapeCSV(c, delimiter)).join(delimiter));
    }

    // Add data rows
    for (const row of rows) {
      const values = columns.map(col => {
        const value = row.data[col];
        return this.escapeCSV(String(value ?? ''), delimiter);
      });
      lines.push(values.join(delimiter));
    }

    return {
      data: lines.join('\n'),
      format: 'csv',
      rowCount: rows.length
    };
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(
    table: Table,
    rows: Row[],
    columns: string[],
    options: ExportOptions
  ): ExportResult {
    const data = rows.map(row => {
      const filtered: any = {};
      for (const col of columns) {
        filtered[col] = row.data[col];
      }
      return filtered;
    });

    const result: any = { data };

    if (options.includeMetadata) {
      result.metadata = {
        tableName: table.name,
        exportedAt: new Date().toISOString(),
        rowCount: rows.length,
        columns: columns
      };
    }

    return {
      data: JSON.stringify(result, null, 2),
      format: 'json',
      rowCount: rows.length,
      metadata: options.includeMetadata ? result.metadata : undefined
    };
  }

  /**
   * Export to Excel format (simplified - returns JSON for now)
   */
  private exportToExcel(
    table: Table,
    rows: Row[],
    columns: string[],
    options: ExportOptions
  ): ExportResult {
    // In a real implementation, use a library like exceljs
    logger.debug('Excel export requested - returning JSON format');
    return this.exportToJSON(table, rows, columns, options);
  }

  /**
   * Export to XML format
   */
  private exportToXML(
    table: Table,
    rows: Row[],
    columns: string[],
    _options: ExportOptions
  ): ExportResult {
    const xmlLines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<table name="${this.escapeXML(table.name)}">`,
      '  <rows>'
    ];

    for (const row of rows) {
      xmlLines.push('    <row>');
      for (const col of columns) {
        const value = row.data[col];
        xmlLines.push(`      <${col}>${this.escapeXML(String(value ?? ''))}</${col}>`);
      }
      xmlLines.push('    </row>');
    }

    xmlLines.push('  </rows>');
    xmlLines.push('</table>');

    return {
      data: xmlLines.join('\n'),
      format: 'xml',
      rowCount: rows.length
    };
  }

  /**
   * Export to Parquet format (simplified - returns JSON for now)
   */
  private exportToParquet(
    table: Table,
    rows: Row[],
    columns: string[],
    options: ExportOptions
  ): ExportResult {
    // In a real implementation, use a library like parquetjs
    logger.debug('Parquet export requested - returning JSON format');
    return this.exportToJSON(table, rows, columns, options);
  }

  /**
   * Parse CSV data
   */
  private parseCSV(data: string | Buffer, options: ImportOptions): any[] {
    const content = Buffer.isBuffer(data) ? data.toString('utf-8') : data;
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) return [];

    // Skip rows if specified
    const startIndex = options.skipRows || 1; // Default: skip header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const result: any[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] ?? null;
      }

      result.push(row);
    }

    return result;
  }

  /**
   * Parse a single CSV line
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Parse JSON data
   */
  private parseJSON(data: string | Buffer, _options: ImportOptions): any[] {
    const content = Buffer.isBuffer(data) ? data.toString('utf-8') : data;
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }

    throw new Error('Invalid JSON format: expected array or object with data array');
  }

  /**
   * Parse Excel data (simplified - expects JSON for now)
   */
  private parseExcel(data: string | Buffer, options: ImportOptions): any[] {
    // In a real implementation, use a library like exceljs
    logger.debug('Excel import requested - parsing as JSON');
    return this.parseJSON(data, options);
  }

  /**
   * Parse XML data
   */
  private parseXML(data: string | Buffer, _options: ImportOptions): any[] {
    const content = Buffer.isBuffer(data) ? data.toString('utf-8') : data;
    const result: any[] = [];

    // Simple XML parser (for production, use a proper library)
    const rowMatches = content.match(/<row>([\s\S]*?)<\/row>/g);

    if (rowMatches) {
      for (const rowMatch of rowMatches) {
        const row: any = {};
        const fieldMatches = rowMatch.match(/<(\w+)>([\s\S]*?)<\/\1>/g);

        if (fieldMatches) {
          for (const fieldMatch of fieldMatches) {
            const match = fieldMatch.match(/<(\w+)>([\s\S]*?)<\/\1>/);
            if (match) {
              row[match[1]] = this.unescapeXML(match[2]);
            }
          }
        }

        result.push(row);
      }
    }

    return result;
  }

  /**
   * Validate import data without importing
   */
  private validateImportData(table: Table, data: any[]): ImportResult {
    const errors: OperationError[] = [];
    let validCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = this.validateRow(table, row, i);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validCount++;
      }
    }

    return {
      success: errors.length === 0,
      rowCount: data.length,
      importedCount: validCount,
      skippedCount: data.length - validCount,
      errors
    };
  }

  /**
   * Validate a single row
   */
  private validateRow(table: Table, data: any, rowIndex: number): OperationError[] {
    const errors: OperationError[] = [];

    for (const column of table.schema.columns) {
      const value = data[column.name];

      if (!column.nullable && (value === undefined || value === null)) {
        errors.push({
          row: rowIndex,
          field: column.name,
          error: `Required field ${column.name} is missing`
        });
      }
    }

    return errors;
  }

  /**
   * Import rows into table
   */
  private async importRows(
    table: Table,
    data: any[],
    options: ImportOptions,
    createRowFn: (data: any) => Promise<Row>
  ): Promise<ImportResult> {
    const errors: OperationError[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < data.length; i++) {
      try {
        await createRowFn(data[i]);
        importedCount++;
      } catch (error) {
        const err: OperationError = {
          row: i,
          error: (error as Error).message
        };
        errors.push(err);

        if (options.onError === 'stop') {
          break;
        }

        skippedCount++;
      }
    }

    return {
      success: errors.length === 0,
      rowCount: data.length,
      importedCount,
      skippedCount,
      errors
    };
  }

  /**
   * Escape value for CSV
   */
  private escapeCSV(value: string, delimiter: string): string {
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Escape value for XML
   */
  private escapeXML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Unescape XML value
   */
  private unescapeXML(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
}
