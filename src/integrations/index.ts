/**
 * Integration Services Index
 *
 * Complete backend integration services for workflow automation
 * All integrations include:
 * - Rate limiting integration
 * - Proper error handling
 * - TypeScript type safety
 * - Logging via LoggingService
 */

// Import classes and factory functions for internal use
import { AWSS3Integration, createAWSS3Integration as createAWSS3IntegrationImport } from './AWSS3Integration';
import { GoogleDriveIntegration, createGoogleDriveIntegration as createGoogleDriveIntegrationImport } from './GoogleDriveIntegration';
import { SlackIntegration, createSlackIntegration as createSlackIntegrationImport } from './SlackIntegration';
import { DiscordIntegration, createDiscordIntegration as createDiscordIntegrationImport } from './DiscordIntegration';
import { AirtableIntegration, createAirtableIntegration as createAirtableIntegrationImport } from './AirtableIntegration';

// Cloud Storage
export {
  AWSS3Integration,
  createAWSS3Integration,
  type AWSS3Credentials,
  type S3Bucket,
  type S3Object,
  type S3UploadOptions,
  type S3ListOptions,
  type S3CopyOptions,
  type S3GetSignedUrlOptions
} from './AWSS3Integration';

export {
  GoogleDriveIntegration,
  createGoogleDriveIntegration,
  type GoogleDriveCredentials,
  type DriveFile,
  type DrivePermission,
  type DriveListOptions,
  type DriveUploadOptions,
  type DriveExportFormat
} from './GoogleDriveIntegration';

// Communication
export {
  SlackIntegration,
  createSlackIntegration,
  type SlackCredentials,
  type SlackMessage,
  type SlackBlock,
  type SlackAttachment,
  type SlackChannel,
  type SlackUser,
  type SlackFile
} from './SlackIntegration';

export {
  DiscordIntegration,
  createDiscordIntegration,
  type DiscordCredentials,
  type DiscordMessage,
  type DiscordEmbed,
  type DiscordChannel,
  type DiscordGuild,
  type DiscordMember,
  type DiscordRole
} from './DiscordIntegration';

// Database/Low-code
export {
  AirtableIntegration,
  createAirtableIntegration,
  type AirtableCredentials,
  type AirtableRecord,
  type AirtableTable,
  type AirtableField,
  type AirtableView,
  type AirtableBase,
  type AirtableListOptions,
  type AirtableCreateOptions,
  type AirtableUpdateOptions
} from './AirtableIntegration';

/**
 * Integration factory - creates integration instance from type
 */
export function createIntegration<T extends IntegrationType>(
  type: T,
  credentials: IntegrationCredentials[T]
): IntegrationInstance[T] {
  switch (type) {
    case 'slack':
      return createSlackIntegrationImport(credentials as IntegrationCredentials['slack']) as IntegrationInstance[T];
    case 'discord':
      return createDiscordIntegrationImport(credentials as IntegrationCredentials['discord']) as IntegrationInstance[T];
    case 'awsS3':
      return createAWSS3IntegrationImport(credentials as IntegrationCredentials['awsS3']) as IntegrationInstance[T];
    case 'googleDrive':
      return createGoogleDriveIntegrationImport(credentials as IntegrationCredentials['googleDrive']) as IntegrationInstance[T];
    case 'airtable':
      return createAirtableIntegrationImport(credentials as IntegrationCredentials['airtable']) as IntegrationInstance[T];
    default:
      throw new Error(`Unknown integration type: ${type}`);
  }
}

// Type definitions for factory function
export type IntegrationType = 'slack' | 'discord' | 'awsS3' | 'googleDrive' | 'airtable';

export interface IntegrationCredentials {
  slack: import('./SlackIntegration').SlackCredentials;
  discord: import('./DiscordIntegration').DiscordCredentials;
  awsS3: import('./AWSS3Integration').AWSS3Credentials;
  googleDrive: import('./GoogleDriveIntegration').GoogleDriveCredentials;
  airtable: import('./AirtableIntegration').AirtableCredentials;
}

export interface IntegrationInstance {
  slack: SlackIntegration;
  discord: DiscordIntegration;
  awsS3: AWSS3Integration;
  googleDrive: GoogleDriveIntegration;
  airtable: AirtableIntegration;
}
