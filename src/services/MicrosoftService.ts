import { SecretsService } from './SecretsService';
import { logger } from './SimpleLogger';

export interface MicrosoftCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface Excel365Operation {
  type: 'read' | 'write' | 'create' | 'update' | 'delete';
  workbookId: string;
  worksheetName?: string;
  range?: string;
  data?: unknown[][];
  headers?: string[];
}

export interface SharePointOperation {
  type: 'upload' | 'download' | 'list' | 'create_folder' | 'share';
  siteUrl: string;
  libraryName: string;
  fileName?: string;
  filePath?: string;
  content?: Buffer | string;
  permissions?: string[];
}

export interface PowerBIOperation {
  type: 'create_report' | 'update_dataset' | 'export_report' | 'get_datasets';
  workspaceId: string;
  datasetId?: string;
  reportId?: string;
  data?: unknown[];
  filters?: Record<string, unknown>;
}

export interface Dynamics365Operation {
  type: 'create' | 'read' | 'update' | 'delete' | 'query';
  entity: string;
  entityId?: string;
  data?: Record<string, unknown>;
  query?: string;
  filters?: Record<string, unknown>;
}

export interface TeamsOperation {
  type: 'send_message' | 'create_channel' | 'schedule_meeting' | 'share_file';
  teamId: string;
  channelId?: string;
  message?: string;
  subject?: string;
  participants?: string[];
  startTime?: string;
  endTime?: string;
  filePath?: string;
}

export interface OutlookOperation {
  type: 'send_email' | 'create_event' | 'get_emails' | 'get_calendar';
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  attachments?: Array<{
    name: string;
    content: Buffer | string;
    contentType: string;
  }>;
  eventTitle?: string;
  eventStart?: string;
  eventEnd?: string;
  attendees?: string[];
  filters?: Record<string, unknown>;
}

export class MicrosoftService {
  private secretsService: SecretsService;
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  private tokenCache: Map<string, { token: string; expires: number }> = new Map();

  constructor(secretsService: SecretsService) {
    this.secretsService = secretsService;
  }

  // Authentication and token management
  async authenticate(credentials: MicrosoftCredentials): Promise<string> {
    try {
      const tokenUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          scope: 'https://graph.microsoft.com/.default'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Authentication failed: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json() as { access_token: string; expires_in: number };
      // Cache token
      this.tokenCache.set(credentials.clientId, {
        token: tokenData.access_token,
        expires: Date.now() + (tokenData.expires_in * 1000)
      });

      return tokenData.access_token;
    } catch (error) {
      logger.error('Microsoft authentication failed:', error);
      throw error;
    }
  }

  private async getToken(credentials: MicrosoftCredentials): Promise<string> {
    const cached = this.tokenCache.get(credentials.clientId);
    if (cached && cached.expires > Date.now() + 60000) { // 1 minute buffer
      return cached.token;
    }

    return await this.authenticate(credentials);
  }

  // Excel 365 Operations
  async executeExcel365Operation(
    credentials: MicrosoftCredentials,
    operation: Excel365Operation
  ): Promise<unknown> {
    const token = await this.getToken(credentials);
    switch (operation.type) {
      case 'read':
        return this.readExcelData(token, operation);
      case 'write':
        return this.writeExcelData(token, operation);
      case 'create':
        return this.createExcelWorkbook(token, operation);
      case 'update':
        return this.updateExcelData(token, operation);
      default:
        throw new Error(`Unsupported Excel operation: ${operation.type}`);
    }
  }

  private async readExcelData(token: string, operation: Excel365Operation): Promise<unknown> {
    const url = `${this.baseUrl}/me/drive/items/${operation.workbookId}/workbook/worksheets/${operation.worksheetName}/range(address='${operation.range}')`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Excel read failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async writeExcelData(token: string, operation: Excel365Operation): Promise<unknown> {
    const url = `${this.baseUrl}/me/drive/items/${operation.workbookId}/workbook/worksheets/${operation.worksheetName}/range(address='${operation.range}')`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: operation.data
      })
    });

    if (!response.ok) {
      throw new Error(`Excel write failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async createExcelWorkbook(token: string, operation: Excel365Operation): Promise<unknown> {
    const url = `${this.baseUrl}/me/drive/root/children`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${operation.workbookId}.xlsx`,
        '@microsoft.graph.conflictBehavior': 'rename'
      })
    });

    if (!response.ok) {
      throw new Error(`Excel workbook creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async updateExcelData(token: string, operation: Excel365Operation): Promise<unknown> {
    return this.writeExcelData(token, operation);
  }

  // SharePoint Operations
  async executeSharePointOperation(
    credentials: MicrosoftCredentials,
    operation: SharePointOperation
  ): Promise<unknown> {
    const token = await this.getToken(credentials);
    switch (operation.type) {
      case 'upload':
        return this.uploadToSharePoint(token, operation);
      case 'download':
        return this.downloadFromSharePoint(token, operation);
      case 'list':
        return this.listSharePointFiles(token, operation);
      case 'create_folder':
        return this.createSharePointFolder(token, operation);
      default:
        throw new Error(`Unsupported SharePoint operation: ${operation.type}`);
    }
  }

  private async uploadToSharePoint(token: string, operation: SharePointOperation): Promise<unknown> {
    const url = `${operation.siteUrl}/_api/web/GetFolderByServerRelativeUrl('${operation.libraryName}')/Files/add(url='${operation.fileName}',overwrite=true)`;
    const body = typeof operation.content === 'string'
      ? operation.content
      : operation.content;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      },
      body: body as BodyInit
    });

    if (!response.ok) {
      throw new Error(`SharePoint upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async downloadFromSharePoint(token: string, operation: SharePointOperation): Promise<unknown> {
    const url = `${operation.siteUrl}/_api/web/GetFileByServerRelativeUrl('${operation.filePath}')/$value`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`SharePoint download failed: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  private async listSharePointFiles(token: string, operation: SharePointOperation): Promise<unknown> {
    const url = `${operation.siteUrl}/_api/web/GetFolderByServerRelativeUrl('${operation.libraryName}')/Files`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`SharePoint list failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async createSharePointFolder(token: string, operation: SharePointOperation): Promise<unknown> {
    const url = `${operation.siteUrl}/_api/web/folders`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: operation.fileName,
        folder: {}
      })
    });

    if (!response.ok) {
      throw new Error(`SharePoint folder creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Power BI Operations
  async executePowerBIOperation(
    credentials: MicrosoftCredentials,
    operation: PowerBIOperation
  ): Promise<unknown> {
    const token = await this.getToken(credentials);
    switch (operation.type) {
      case 'get_datasets':
        return this.getPowerBIDatasets(token, operation);
      case 'update_dataset':
        return this.updatePowerBIDataset(token, operation);
      case 'export_report':
        return this.exportPowerBIReport(token, operation);
      default:
        throw new Error(`Unsupported Power BI operation: ${operation.type}`);
    }
  }

  private async getPowerBIDatasets(token: string, operation: PowerBIOperation): Promise<unknown> {
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${operation.workspaceId}/datasets`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Power BI datasets fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async updatePowerBIDataset(token: string, operation: PowerBIOperation): Promise<unknown> {
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${operation.workspaceId}/datasets/${operation.datasetId}/tables/RealTimeData/rows`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rows: operation.data
      })
    });

    if (!response.ok) {
      throw new Error(`Power BI dataset update failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async exportPowerBIReport(token: string, operation: PowerBIOperation): Promise<unknown> {
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${operation.workspaceId}/reports/${operation.reportId}/ExportTo`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        format: 'PDF',
        powerBIReportConfiguration: {
          settings: {
            locale: 'en-US'
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Power BI report export failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Dynamics 365 Operations
  async executeDynamics365Operation(
    credentials: MicrosoftCredentials,
    operation: Dynamics365Operation
  ): Promise<unknown> {
    const token = await this.getToken(credentials);
    switch (operation.type) {
      case 'create':
        return this.createDynamics365Record(token, operation);
      case 'read':
        return this.readDynamics365Record(token, operation);
      case 'update':
        return this.updateDynamics365Record(token, operation);
      case 'delete':
        return this.deleteDynamics365Record(token, operation);
      case 'query':
        return this.queryDynamics365Records(token, operation);
      default:
        throw new Error(`Unsupported Dynamics 365 operation: ${operation.type}`);
    }
  }

  private async createDynamics365Record(token: string, operation: Dynamics365Operation): Promise<unknown> {
    const url = `https://org.crm.dynamics.com/api/data/v9.2/${operation.entity}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(operation.data)
    });

    if (!response.ok) {
      throw new Error(`Dynamics 365 record creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async readDynamics365Record(token: string, operation: Dynamics365Operation): Promise<unknown> {
    const url = `https://org.crm.dynamics.com/api/data/v9.2/${operation.entity}(${operation.entityId})`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Dynamics 365 record read failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async updateDynamics365Record(token: string, operation: Dynamics365Operation): Promise<unknown> {
    const url = `https://org.crm.dynamics.com/api/data/v9.2/${operation.entity}(${operation.entityId})`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(operation.data)
    });

    if (!response.ok) {
      throw new Error(`Dynamics 365 record update failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async deleteDynamics365Record(token: string, operation: Dynamics365Operation): Promise<unknown> {
    const url = `https://org.crm.dynamics.com/api/data/v9.2/${operation.entity}(${operation.entityId})`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Dynamics 365 record deletion failed: ${response.statusText}`);
    }

    return { success: true };
  }

  private async queryDynamics365Records(token: string, operation: Dynamics365Operation): Promise<unknown> {
    // Validate and sanitize the query to prevent OData injection
    if (!operation.query || typeof operation.query !== 'string') {
      throw new Error('Invalid query: must be a non-empty string');
    }

    // Basic validation to ensure only safe OData syntax
    const allowedPattern = /^[a-zA-Z0-9_\s\(\),=<>'\$\.\*\-\/]+$/;
    if (!allowedPattern.test(operation.query)) {
      throw new Error('Invalid query: contains unauthorized characters');
    }

    // URL encode the query parameter to prevent injection
    const encodedQuery = encodeURIComponent(operation.query);
    const url = `https://org.crm.dynamics.com/api/data/v9.2/${operation.entity}?$filter=${encodedQuery}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Dynamics 365 query failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Teams Operations
  async executeTeamsOperation(
    credentials: MicrosoftCredentials,
    operation: TeamsOperation
  ): Promise<unknown> {
    const token = await this.getToken(credentials);
    switch (operation.type) {
      case 'send_message':
        return this.sendTeamsMessage(token, operation);
      case 'create_channel':
        return this.createTeamsChannel(token, operation);
      case 'schedule_meeting':
        return this.scheduleTeamsMeeting(token, operation);
      default:
        throw new Error(`Unsupported Teams operation: ${operation.type}`);
    }
  }

  private async sendTeamsMessage(token: string, operation: TeamsOperation): Promise<unknown> {
    const url = `${this.baseUrl}/teams/${operation.teamId}/channels/${operation.channelId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: {
          content: operation.message
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Teams message send failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async createTeamsChannel(token: string, operation: TeamsOperation): Promise<unknown> {
    const url = `${this.baseUrl}/teams/${operation.teamId}/channels`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: operation.channelId,
        description: 'Channel created via WorkflowBuilder Pro'
      })
    });

    if (!response.ok) {
      throw new Error(`Teams channel creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async scheduleTeamsMeeting(token: string, operation: TeamsOperation): Promise<unknown> {
    const url = `${this.baseUrl}/me/onlineMeetings`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: operation.subject,
        startDateTime: operation.startTime,
        endDateTime: operation.endTime,
        participants: {
          attendees: operation.participants?.map(email => ({
            identity: {
              user: {
                id: email
              }
            }
          }))
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Teams meeting scheduling failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Outlook Operations
  async executeOutlookOperation(
    credentials: MicrosoftCredentials,
    operation: OutlookOperation
  ): Promise<unknown> {
    const token = await this.getToken(credentials);
    switch (operation.type) {
      case 'send_email':
        return this.sendOutlookEmail(token, operation);
      case 'create_event':
        return this.createOutlookEvent(token, operation);
      case 'get_emails':
        return this.getOutlookEmails(token, operation);
      case 'get_calendar':
        return this.getOutlookCalendar(token, operation);
      default:
        throw new Error(`Unsupported Outlook operation: ${operation.type}`);
    }
  }

  private async sendOutlookEmail(token: string, operation: OutlookOperation): Promise<unknown> {
    const url = `${this.baseUrl}/me/sendMail`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          subject: operation.subject,
          body: {
            contentType: 'HTML',
            content: operation.body
          },
          toRecipients: operation.to?.map(email => ({
            emailAddress: {
              address: email
            }
          })),
          ccRecipients: operation.cc?.map(email => ({
            emailAddress: {
              address: email
            }
          })),
          attachments: operation.attachments?.map(att => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: att.name,
            contentType: att.contentType,
            contentBytes: Buffer.from(att.content).toString('base64')
          }))
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Outlook email send failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async createOutlookEvent(token: string, operation: OutlookOperation): Promise<unknown> {
    const url = `${this.baseUrl}/me/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: operation.eventTitle,
        start: {
          dateTime: operation.eventStart,
          timeZone: 'UTC'
        },
        end: {
          dateTime: operation.eventEnd,
          timeZone: 'UTC'
        },
        attendees: operation.attendees?.map(email => ({
          emailAddress: {
            address: email
          }
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Outlook event creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async getOutlookEmails(token: string, operation: OutlookOperation): Promise<unknown> {
    const url = `${this.baseUrl}/me/messages`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Outlook emails fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async getOutlookCalendar(token: string, operation: OutlookOperation): Promise<unknown> {
    const url = `${this.baseUrl}/me/calendar/events`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Outlook calendar fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Utility methods
  async testConnection(credentials: MicrosoftCredentials): Promise<boolean> {
    try {
      const token = await this.getToken(credentials);
      const url = `${this.baseUrl}/me`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      logger.error('Microsoft connection test failed:', error);
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAvailableServices(_credentials: MicrosoftCredentials): Promise<string[]> {
    const services = [
      'excel365',
      'sharepoint',
      'powerbi',
      'dynamics365',
      'teams',
      'outlook',
      'onedrive'
    ];

    return services;
  }

  async validatePermissions(credentials: MicrosoftCredentials, service: string): Promise<boolean> {
    try {
      const token = await this.getToken(credentials);
      // Test specific service endpoints
      const endpoints: Record<string, string> = {
        excel365: `${this.baseUrl}/me/drive/root/children`,
        sharepoint: `${this.baseUrl}/sites`,
        powerbi: 'https://api.powerbi.com/v1.0/myorg/datasets',
        dynamics365: `${this.baseUrl}/me/contacts`,
        teams: `${this.baseUrl}/me/joinedTeams`,
        outlook: `${this.baseUrl}/me/messages`
      };

      const endpoint = endpoints[service];
      if (!endpoint) return false;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      logger.error(`Permission validation failed for ${service}:`, error);
      return false;
    }
  }
}
