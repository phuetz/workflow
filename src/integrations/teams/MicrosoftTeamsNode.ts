/**
 * Microsoft Teams Integration Node
 * Complete collaboration integration with Microsoft Teams API
 */

import { NodeType, WorkflowNode } from '../../types/workflow';

export interface TeamsNodeConfig {
  action: 'send_message' | 'create_channel' | 'create_team' | 'add_member' | 'create_meeting' | 'upload_file' | 'get_messages' | 'webhook';
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  // Message parameters
  teamId?: string;
  channelId?: string;
  message?: string;
  messageFormat?: 'text' | 'html' | 'markdown';
  mentions?: Array<{ id: string; name: string }>;
  attachments?: Array<{
    contentType: string;
    contentUrl: string;
    name: string;
  }>;
  // Channel parameters
  channelName?: string;
  channelDescription?: string;
  channelType?: 'standard' | 'private';
  // Team parameters
  teamName?: string;
  teamDescription?: string;
  teamVisibility?: 'private' | 'public';
  // Meeting parameters
  subject?: string;
  startDateTime?: string;
  endDateTime?: string;
  attendees?: string[];
  isOnlineMeeting?: boolean;
  // File parameters
  fileName?: string;
  fileContent?: string;
  filePath?: string;
  // Webhook parameters
  webhookUrl?: string;
  card?: any; // Adaptive card JSON
}

export const teamsNodeType: NodeType = {
  type: 'teams',
  label: 'Microsoft Teams',
  icon: 'Users',
  color: 'bg-purple-700',
  category: 'communication',
  inputs: 1,
  outputs: 2,
  description: 'Send messages, create channels, schedule meetings in Microsoft Teams',
  errorHandle: true
};

// Simple NodeExecutor interface for this integration
interface NodeExecutor {
  execute(node: WorkflowNode, inputData: any): Promise<any>;
}

export class TeamsNodeExecutor implements NodeExecutor {
  private client: any = null; // Client type from @microsoft/microsoft-graph-client

  private async initClient(config: TeamsNodeConfig): Promise<any> {
    // Dynamic import to handle optional dependencies
    // @ts-ignore - Optional peer dependency
    const { Client } = await import('@microsoft/microsoft-graph-client');

    if (config.accessToken) {
      // Use provided access token
      return Client.init({
        authProvider: (done: any) => {
          done(null, config.accessToken);
        }
      });
    } else {
      // Use client credentials flow
      // @ts-ignore - Optional peer dependency
      const { ClientSecretCredential } = await import('@azure/identity');
      // @ts-ignore - Optional peer dependency
      const { TokenCredentialAuthenticationProvider } = await import('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');

      const credential = new ClientSecretCredential(
        config.tenantId || process.env.TEAMS_TENANT_ID!,
        config.clientId || process.env.TEAMS_CLIENT_ID!,
        config.clientSecret || process.env.TEAMS_CLIENT_SECRET!
      );

      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
      });

      return Client.initWithMiddleware({
        authProvider
      });
    }
  }

  async execute(node: WorkflowNode, inputData: any): Promise<any> {
    const config = (node.data?.config || {}) as unknown as TeamsNodeConfig;

    try {
      // Webhook action doesn't need Graph API client
      if (config.action === 'webhook') {
        return await this.sendWebhook(config, inputData);
      }

      this.client = await this.initClient(config);

      switch (config.action) {
        case 'send_message':
          return await this.sendMessage(config, inputData);
        
        case 'create_channel':
          return await this.createChannel(config, inputData);
        
        case 'create_team':
          return await this.createTeam(config, inputData);
        
        case 'add_member':
          return await this.addMember(config, inputData);
        
        case 'create_meeting':
          return await this.createMeeting(config, inputData);
        
        case 'upload_file':
          return await this.uploadFile(config, inputData);
        
        case 'get_messages':
          return await this.getMessages(config, inputData);
        
        default:
          throw new Error(`Unknown Teams action: ${config.action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any).code || 'TEAMS_ERROR'
      };
    }
  }

  private async sendMessage(config: TeamsNodeConfig, inputData: any): Promise<any> {
    const teamId = config.teamId || inputData.teamId;
    const channelId = config.channelId || inputData.channelId;
    const message = config.message || inputData.message;

    if (!teamId || !channelId || !message) {
      throw new Error('Team ID, Channel ID and message are required');
    }

    const messageBody: any = {
      body: {
        contentType: config.messageFormat || 'text',
        content: message
      }
    };

    // Add mentions if provided
    if (config.mentions || inputData.mentions) {
      const mentions = config.mentions || inputData.mentions;
      messageBody.mentions = mentions.map((mention: any) => ({
        id: mention.id,
        mentionText: mention.name,
        mentioned: {
          user: {
            id: mention.id,
            displayName: mention.name
          }
        }
      }));
    }

    // Add attachments if provided
    if (config.attachments || inputData.attachments) {
      messageBody.attachments = config.attachments || inputData.attachments;
    }

    const result = await this.client!
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .post(messageBody);

    return {
      success: true,
      messageId: result.id,
      teamId,
      channelId,
      message: result.body.content,
      createdDateTime: result.createdDateTime
    };
  }

  private async createChannel(config: TeamsNodeConfig, inputData: any): Promise<any> {
    const teamId = config.teamId || inputData.teamId;
    const channelName = config.channelName || inputData.channelName;
    const channelDescription = config.channelDescription || inputData.channelDescription;
    const channelType = config.channelType || inputData.channelType || 'standard';

    if (!teamId || !channelName) {
      throw new Error('Team ID and channel name are required');
    }

    const channelBody = {
      displayName: channelName,
      description: channelDescription,
      membershipType: channelType
    };

    const result = await this.client!
      .api(`/teams/${teamId}/channels`)
      .post(channelBody);

    return {
      success: true,
      channelId: result.id,
      channelName: result.displayName,
      teamId,
      webUrl: result.webUrl
    };
  }

  private async createTeam(config: TeamsNodeConfig, inputData: any): Promise<any> {
    const teamName = config.teamName || inputData.teamName;
    const teamDescription = config.teamDescription || inputData.teamDescription;
    const visibility = config.teamVisibility || inputData.teamVisibility || 'private';
    const owners = inputData.owners || [];

    if (!teamName) {
      throw new Error('Team name is required');
    }

    const teamBody: any = {
      'template@odata.bind': 'https://graph.microsoft.com/v1.0/teamsTemplates(\'standard\')',
      displayName: teamName,
      description: teamDescription,
      visibility
    };

    // Add owners if provided
    if (owners.length > 0) {
      teamBody.members = owners.map((ownerId: string) => ({
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${ownerId}')`
      }));
    }

    const result = await this.client!
      .api('/teams')
      .post(teamBody);

    // Get the team ID from the response headers
    const teamId = result.headers.get('Content-Location')?.split('/')?.pop()?.replace("'", '');

    return {
      success: true,
      teamId,
      teamName,
      description: teamDescription,
      visibility
    };
  }

  private async addMember(config: TeamsNodeConfig, inputData: any): Promise<any> {
    const teamId = config.teamId || inputData.teamId;
    const userId = inputData.userId;
    const roles = inputData.roles || ['member'];

    if (!teamId || !userId) {
      throw new Error('Team ID and user ID are required');
    }

    const memberBody = {
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      roles,
      'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`
    };

    const result = await this.client!
      .api(`/teams/${teamId}/members`)
      .post(memberBody);

    return {
      success: true,
      memberId: result.id,
      teamId,
      userId,
      roles
    };
  }

  private async createMeeting(config: TeamsNodeConfig, inputData: any): Promise<any> {
    const subject = config.subject || inputData.subject;
    const startDateTime = config.startDateTime || inputData.startDateTime;
    const endDateTime = config.endDateTime || inputData.endDateTime;
    const attendees = config.attendees || inputData.attendees || [];
    const isOnlineMeeting = config.isOnlineMeeting !== false;

    if (!subject || !startDateTime || !endDateTime) {
      throw new Error('Subject, start date/time and end date/time are required');
    }

    const meetingBody: any = {
      subject,
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC'
      },
      isOnlineMeeting
    };

    // Add attendees if provided
    if (attendees.length > 0) {
      meetingBody.attendees = attendees.map((email: string) => ({
        emailAddress: { address: email },
        type: 'required'
      }));
    }

    const result = await this.client!
      .api('/me/events')
      .post(meetingBody);

    return {
      success: true,
      meetingId: result.id,
      subject: result.subject,
      joinUrl: result.onlineMeeting?.joinUrl,
      startDateTime: result.start.dateTime,
      endDateTime: result.end.dateTime
    };
  }

  private async uploadFile(config: TeamsNodeConfig, inputData: any): Promise<any> {
    const teamId = config.teamId || inputData.teamId;
    const channelId = config.channelId || inputData.channelId;
    const fileName = config.fileName || inputData.fileName;
    const fileContent = config.fileContent || inputData.fileContent;

    if (!teamId || !channelId || !fileName || !fileContent) {
      throw new Error('Team ID, Channel ID, file name and content are required');
    }

    // Get the channel's files folder
    const driveItem = await this.client!
      .api(`/teams/${teamId}/channels/${channelId}/filesFolder`)
      .get();

    // Upload the file
    const uploadUrl = `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}:/${fileName}:/content`;
    
    const result = await this.client!
      .api(uploadUrl)
      .put(fileContent);

    return {
      success: true,
      fileId: result.id,
      fileName: result.name,
      webUrl: result.webUrl,
      size: result.size,
      teamId,
      channelId
    };
  }

  private async getMessages(config: TeamsNodeConfig, inputData: any): Promise<any> {
    const teamId = config.teamId || inputData.teamId;
    const channelId = config.channelId || inputData.channelId;
    const limit = inputData.limit || 50;

    if (!teamId || !channelId) {
      throw new Error('Team ID and Channel ID are required');
    }

    const messages = await this.client!
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .top(limit)
      .get();

    return {
      success: true,
      messages: messages.value.map((msg: any) => ({
        id: msg.id,
        content: msg.body.content,
        from: msg.from?.user?.displayName,
        createdDateTime: msg.createdDateTime,
        attachments: msg.attachments
      })),
      count: messages.value.length,
      teamId,
      channelId
    };
  }

  private async sendWebhook(config: TeamsNodeConfig, inputData: any): Promise<any> {
    const webhookUrl = config.webhookUrl || inputData.webhookUrl;
    const message = config.message || inputData.message;
    const card = config.card || inputData.card;

    if (!webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    let payload: any;

    if (card) {
      // Send adaptive card
      payload = {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: card
        }]
      };
    } else {
      // Send simple message
      payload = {
        text: message || 'Notification from Workflow Automation'
      };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    return {
      success: true,
      status: response.status,
      message: 'Webhook sent successfully'
    };
  }
}

// Configuration UI schema for the node
export const teamsNodeConfigSchema = {
  action: {
    type: 'select',
    label: 'Action',
    options: [
      { value: 'send_message', label: 'Send Message' },
      { value: 'create_channel', label: 'Create Channel' },
      { value: 'create_team', label: 'Create Team' },
      { value: 'add_member', label: 'Add Member' },
      { value: 'create_meeting', label: 'Create Meeting' },
      { value: 'upload_file', label: 'Upload File' },
      { value: 'get_messages', label: 'Get Messages' },
      { value: 'webhook', label: 'Send Webhook' }
    ],
    default: 'send_message'
  },
  teamId: {
    type: 'string',
    label: 'Team ID',
    showWhen: { action: ['send_message', 'create_channel', 'add_member', 'upload_file', 'get_messages'] }
  },
  channelId: {
    type: 'string',
    label: 'Channel ID',
    showWhen: { action: ['send_message', 'upload_file', 'get_messages'] }
  },
  message: {
    type: 'textarea',
    label: 'Message',
    showWhen: { action: ['send_message', 'webhook'] }
  },
  messageFormat: {
    type: 'select',
    label: 'Message Format',
    options: [
      { value: 'text', label: 'Plain Text' },
      { value: 'html', label: 'HTML' },
      { value: 'markdown', label: 'Markdown' }
    ],
    default: 'text',
    showWhen: { action: 'send_message' }
  },
  webhookUrl: {
    type: 'string',
    label: 'Webhook URL',
    showWhen: { action: 'webhook' }
  },
  tenantId: {
    type: 'credential',
    label: 'Tenant ID'
  },
  clientId: {
    type: 'credential',
    label: 'Client ID'
  },
  clientSecret: {
    type: 'credential',
    label: 'Client Secret'
  }
};