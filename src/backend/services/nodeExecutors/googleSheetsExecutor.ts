/**
 * Google Sheets Node Executor
 * Real integration with Google Sheets API via googleapis
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { logger } from '../../../services/SimpleLogger';

async function getGoogleSheetsClient(credentials: Record<string, any>) {
  const { google } = await import('googleapis');

  const oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret
  );

  oauth2Client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
  });

  // Auto-refresh if we have a refresh token
  if (credentials.refreshToken) {
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        credentials.accessToken = tokens.access_token;
      }
    });
  }

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export const googleSheetsExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    if (!credentials.accessToken && !credentials.apiKey) {
      throw new Error('Google credentials are required (accessToken or apiKey)');
    }

    const spreadsheetId = config.spreadsheetId as string;
    const range = config.range as string;
    const operation = (config.operation || 'read') as string;

    if (!spreadsheetId) throw new Error('Spreadsheet ID is required');
    if (!range) throw new Error('Range is required (e.g., "Sheet1!A1:D10")');

    const sheets = await getGoogleSheetsClient(credentials);

    logger.info('Executing Google Sheets operation', { operation, spreadsheetId });

    try {
      let result: any;

      switch (operation) {
        case 'read': {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
          });
          result = {
            values: response.data.values || [],
            range: response.data.range,
            majorDimension: response.data.majorDimension,
          };
          break;
        }

        case 'write': {
          const values = config.values as unknown[][];
          if (!values) throw new Error('Values are required for write operation');
          const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: (config.valueInputOption as string) || 'USER_ENTERED',
            requestBody: { values },
          });
          result = {
            updatedRange: response.data.updatedRange,
            updatedRows: response.data.updatedRows,
            updatedColumns: response.data.updatedColumns,
            updatedCells: response.data.updatedCells,
          };
          break;
        }

        case 'append': {
          const values = config.values as unknown[][];
          if (!values) throw new Error('Values are required for append operation');
          const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: (config.valueInputOption as string) || 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values },
          });
          result = {
            updatedRange: response.data.updates?.updatedRange,
            updatedRows: response.data.updates?.updatedRows,
            updatedCells: response.data.updates?.updatedCells,
          };
          break;
        }

        case 'clear': {
          const response = await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range,
          });
          result = {
            clearedRange: response.data.clearedRange,
          };
          break;
        }

        default:
          throw new Error(`Unknown Google Sheets operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.code === 401 || error.code === 403) {
        throw new Error(`Google Sheets auth error: ${error.message}. Check your OAuth tokens.`);
      }
      throw error;
    }
  },
};
