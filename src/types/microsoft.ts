// Microsoft Services Types
export interface MicrosoftCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  scopes?: string[];
}

export interface MicrosoftAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  error?: string;
}

// Excel 365 Types
export interface Excel365Config {
  workbookId: string;
  worksheetName?: string;
  range?: string;
  includeHeaders?: boolean;
  autoResize?: boolean;
}

export interface Excel365Data {
  values: unknown[][];
  headers?: string[];
  range?: string;
  formulas?: string[][];
  formatting?: ExcelFormatting;
}

export interface ExcelFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  numberFormat?: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface Excel365Workbook {
  id: string;
  name: string;
  worksheets: Excel365Worksheet[];
  lastModified: string;
  createdBy: string;
  shared: boolean;
}

export interface Excel365Worksheet {
  id: string;
  name: string;
  position: number;
  visibility: 'visible' | 'hidden' | 'veryHidden';
  usedRange?: string;
  charts?: Excel365Chart[];
  tables?: Excel365Table[];
}

export interface Excel365Chart {
  id: string;
  name: string;
  type: string;
  position: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface Excel365Table {
  id: string;
  name: string;
  range: string;
  headers: string[];
  totalRowCount: number;
  highlightFirstColumn: boolean;
  highlightLastColumn: boolean;
  showBandedColumns: boolean;
  showBandedRows: boolean;
  showFilterButton: boolean;
  showTotals: boolean;
}

// SharePoint Types
export interface SharePointConfig {
  siteUrl: string;
  listName?: string;
  libraryName?: string;
  folderPath?: string;
  fileName?: string;
  itemId?: string;
}

export interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModified: string;
  createdBy: SharePointUser;
  modifiedBy: SharePointUser;
  mimeType: string;
  downloadUrl: string;
  permissions: SharePointPermission[];
}

export interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
  lastModified: string;
  createdBy: SharePointUser;
  children: (SharePointFile | SharePointFolder)[];
}

export interface SharePointList {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  lastModified: string;
  columns: SharePointColumn[];
  views: SharePointView[];
  contentTypes: SharePointContentType[];
}

export interface SharePointColumn {
  id: string;
  name: string;
  displayName: string;
  type: 'text' | 'number' | 'boolean' | 'dateTime' | 'choice' | 'lookup' | 'url' | 'image';
  required: boolean;
  indexed: boolean;
  options?: string[];
  lookupListId?: string;
  lookupColumnName?: string;
}

export interface SharePointView {
  id: string;
  title: string;
  viewQuery: string;
  isDefault: boolean;
  rowLimit: number;
  scope: 'default' | 'recursive' | 'recursiveAll';
}

export interface SharePointContentType {
  id: string;
  name: string;
  description: string;
  group: string;
  hidden: boolean;
  readOnly: boolean;
  sealed: boolean;
}

export interface SharePointUser {
  id: string;
  displayName: string;
  email: string;
  userPrincipalName: string;
}

export interface SharePointPermission {
  id: string;
  principalId: string;
  principalType: 'user' | 'group' | 'sharePointGroup';
  principalName: string;
  roles: string[];
}

// Power BI Types
export interface PowerBIConfig {
  workspaceId: string;
  datasetId?: string;
  reportId?: string;
  dashboardId?: string;
  tableName?: string;
}

export interface PowerBIDataset {
  id: string;
  name: string;
  description: string;
  tables: PowerBITable[];
  datasources: PowerBIDatasource[];
  isRefreshable: boolean;
  isEffectiveIdentityRequired: boolean;
  isEffectiveIdentityRolesRequired: boolean;
  isOnPremGatewayRequired: boolean;
  targetStorageMode: 'import' | 'directQuery' | 'composite';
  lastRefresh: string;
  refreshStatus: 'completed' | 'failed' | 'inProgress' | 'notStarted';
}

export interface PowerBITable {
  name: string;
  columns: PowerBIColumn[];
  measures: PowerBIMeasure[];
  isHidden: boolean;
  description: string;
}

export interface PowerBIColumn {
  name: string;
  dataType: 'string' | 'int64' | 'double' | 'dateTime' | 'boolean';
  isHidden: boolean;
  columnType: 'data' | 'calculated' | 'calculatedTableColumn';
  expression?: string;
  formatString?: string;
  sortByColumn?: string;
  summarizeBy: 'none' | 'sum' | 'min' | 'max' | 'count' | 'average' | 'distinctCount';
}

export interface PowerBIMeasure {
  name: string;
  expression: string;
  description: string;
  displayFolder: string;
  isHidden: boolean;
  formatString?: string;
}

export interface PowerBIDatasource {
  datasourceType: string;
  connectionDetails: Record<string, unknown>;
  gatewayId?: string;
  credentialType: 'basic' | 'oAuth2' | 'anonymous' | 'key' | 'windows';
}

export interface PowerBIReport {
  id: string;
  name: string;
  description: string;
  datasetId: string;
  embedUrl: string;
  isFromPbix: boolean;
  isOwnedByMe: boolean;
  pages: PowerBIPage[];
  lastModified: string;
  createdBy: string;
  modifiedBy: string;
}

export interface PowerBIPage {
  name: string;
  displayName: string;
  order: number;
  isHidden: boolean;
  visuals: PowerBIVisual[];
}

export interface PowerBIVisual {
  name: string;
  title: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  config: Record<string, unknown>;
  query: Record<string, unknown>;
  filters: PowerBIFilter[];
}

export interface PowerBIFilter {
  table: string;
  column: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'between' | 'notBetween' | 'in' | 'notIn';
  values: unknown[];
  filterType: 'basic' | 'advanced' | 'topN' | 'relativeDate' | 'relativeTime';
  requireSingleSelection?: boolean;
}

export interface PowerBIDashboard {
  id: string;
  displayName: string;
  description: string;
  tiles: PowerBITile[];
  isReadOnly: boolean;
  embedUrl: string;
  lastModified: string;
  createdBy: string;
  modifiedBy: string;
}

export interface PowerBITile {
  id: string;
  title: string;
  subTitle: string;
  embedUrl: string;
  embedData: string;
  rowSpan: number;
  colSpan: number;
  reportId?: string;
  datasetId?: string;
}

// Dynamics 365 Types
export interface Dynamics365Config {
  entity: string;
  entityId?: string;
  attributes?: string[];
  expand?: string[];
  filter?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
}

export interface Dynamics365Entity {
  '@odata.type': string;
  '@odata.id': string;
  '@odata.etag': string;
  id: string;
  createdOn: string;
  modifiedOn: string;
  statusCode: number;
  stateCode: number;
  [key: string]: unknown;
}

export interface Dynamics365Metadata {
  entitySetName: string;
  entityType: string;
  primaryIdAttribute: string;
  primaryNameAttribute: string;
  attributes: Dynamics365Attribute[];
  relationships: Dynamics365Relationship[];
  privileges: Dynamics365Privilege[];
}

export interface Dynamics365Attribute {
  logicalName: string;
  displayName: string;
  description: string;
  attributeType: 'string' | 'integer' | 'decimal' | 'boolean' | 'dateTime' | 'lookup' | 'picklist' | 'memo' | 'money' | 'uniqueidentifier';
  isRequired: boolean;
  isValidForCreate: boolean;
  isValidForUpdate: boolean;
  isValidForRead: boolean;
  isPrimaryId: boolean;
  isPrimaryName: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  options?: Dynamics365Option[];
  targets?: string[];
}

export interface Dynamics365Option {
  value: number;
  label: string;
  color?: string;
}

export interface Dynamics365Relationship {
  schemaName: string;
  relationshipType: 'oneToMany' | 'manyToOne' | 'manyToMany';
  referencedEntity: string;
  referencingEntity: string;
  referencedAttribute: string;
  referencingAttribute: string;
}

export interface Dynamics365Privilege {
  privilegeName: string;
  privilegeType: 'create' | 'read' | 'write' | 'delete' | 'append' | 'appendTo' | 'assign' | 'share';
  canBeBasic: boolean;
  canBeLocal: boolean;
  canBeDeep: boolean;
  canBeGlobal: boolean;
}

// Teams Types
export interface TeamsConfig {
  teamId: string;
  channelId?: string;
  chatId?: string;
  userId?: string;
  messageId?: string;
}

export interface TeamsMessage {
  id: string;
  messageType: 'message' | 'chatMessage' | 'typing' | 'systemMessage';
  from: TeamsUser;
  body: {
    content: string;
    contentType: 'text' | 'html';
  };
  subject?: string;
  attachments?: TeamsAttachment[];
  mentions?: TeamsMention[];
  reactions?: TeamsReaction[];
  replies?: TeamsMessage[];
  importance: 'normal' | 'high' | 'urgent';
  locale: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  deletedDateTime?: string;
  webUrl: string;
}

export interface TeamsUser {
  id: string;
  displayName: string;
  userIdentityType: 'aadUser' | 'onPremiseAadUser' | 'anonymousGuest' | 'federatedUser';
  userPrincipalName?: string;
  email?: string;
  tenantId?: string;
}

export interface TeamsAttachment {
  id: string;
  contentType: string;
  contentUrl: string;
  name: string;
  content?: unknown;
  thumbnailUrl?: string;
}

export interface TeamsMention {
  id: number;
  mentionText: string;
  mentioned: TeamsUser;
}

export interface TeamsReaction {
  reactionType: 'like' | 'angry' | 'sad' | 'laugh' | 'heart' | 'surprised';
  user: TeamsUser;
  createdDateTime: string;
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  email?: string;
  webUrl: string;
  membershipType: 'standard' | 'private' | 'shared';
  createdDateTime: string;
  moderationSettings?: {
    userNewMessageRestriction: 'everyone' | 'everyoneExceptGuests' | 'moderators';
    replyRestriction: 'everyone' | 'everyoneExceptGuests' | 'moderators';
    allowNewMessageFromBots: boolean;
    allowNewMessageFromConnectors: boolean;
  };
  tabs?: TeamsTab[];
}

export interface TeamsTab {
  id: string;
  displayName: string;
  webUrl: string;
  configuration?: {
    entityId: string;
    contentUrl: string;
    removeUrl?: string;
    websiteUrl?: string;
  };
  teamsApp: {
    id: string;
    displayName: string;
    distributionMethod: 'store' | 'organization' | 'sideloaded';
  };
}

export interface TeamsTeam {
  id: string;
  displayName: string;
  description?: string;
  isArchived: boolean;
  visibility: 'private' | 'public' | 'hiddenMembership';
  webUrl: string;
  createdDateTime: string;
  specialization: 'none' | 'educationStandard' | 'educationClass' | 'educationProfessionalLearningCommunity' | 'educationStaff' | 'healthcareStandard' | 'healthcareCareCoordination';
  funSettings?: {
    allowGiphy: boolean;
    giphyContentRating: 'strict' | 'moderate';
    allowStickersAndMemes: boolean;
    allowCustomMemes: boolean;
  };
  guestSettings?: {
    allowCreateUpdateChannels: boolean;
    allowDeleteChannels: boolean;
  };
  memberSettings?: {
    allowCreateUpdateChannels: boolean;
    allowDeleteChannels: boolean;
    allowAddRemoveApps: boolean;
    allowCreateUpdateRemoveTabs: boolean;
    allowCreateUpdateRemoveConnectors: boolean;
  };
  messagingSettings?: {
    allowUserEditMessages: boolean;
    allowUserDeleteMessages: boolean;
    allowOwnerDeleteMessages: boolean;
    allowTeamMentions: boolean;
    allowChannelMentions: boolean;
  };
  discoverySettings?: {
    showInTeamsSearchAndSuggestions: boolean;
  };
}

export interface TeamsMeeting {
  id: string;
  subject: string;
  body: {
    content: string;
    contentType: 'text' | 'html';
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  organizer: TeamsUser;
  attendees: TeamsAttendee[];
  joinWebUrl: string;
  onlineMeeting: {
    joinUrl: string;
    conferenceId: string;
    tollNumber: string;
    tollFreeNumber: string;
    dialinUrl: string;
  };
  recurrence?: {
    pattern: {
      type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
      interval: number;
      month?: number;
      dayOfMonth?: number;
      daysOfWeek?: string[];
      firstDayOfWeek?: string;
      index?: 'first' | 'second' | 'third' | 'fourth' | 'last';
    };
    range: {
      type: 'endDate' | 'noEnd' | 'numbered';
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
  isOnlineMeeting: boolean;
  onlineMeetingProvider: 'unknown' | 'skypeForBusiness' | 'skypeForConsumer' | 'teamsForBusiness';
  allowedPresenters: 'everyone' | 'organization' | 'roleIsPresenter' | 'organizer' | 'specificPeople';
  audioConferencing?: {
    tollNumber: string;
    tollFreeNumber: string;
    conferenceId: string;
    dialinUrl: string;
  };
  chatInfo?: {
    threadId: string;
    messageId: string;
    replyChainMessageId: string;
  };
}

export interface TeamsAttendee {
  emailAddress: {
    address: string;
    name: string;
  };
  status: {
    response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
    time: string;
  };
  type: 'required' | 'optional' | 'resource';
}

// Outlook Types
export interface OutlookConfig {
  folderId?: string;
  messageId?: string;
  eventId?: string;
  attachmentId?: string;
  ruleId?: string;
  categoryId?: string;
}

export interface OutlookMessage {
  id: string;
  subject: string;
  body: {
    content: string;
    contentType: 'text' | 'html';
  };
  bodyPreview: string;
  from: OutlookEmailAddress;
  toRecipients: OutlookEmailAddress[];
  ccRecipients: OutlookEmailAddress[];
  bccRecipients: OutlookEmailAddress[];
  replyTo: OutlookEmailAddress[];
  sender: OutlookEmailAddress;
  receivedDateTime: string;
  sentDateTime: string;
  hasAttachments: boolean;
  attachments: OutlookAttachment[];
  importance: 'low' | 'normal' | 'high';
  priority: 'low' | 'normal' | 'high';
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
  isDeliveryReceiptRequested: boolean;
  isReadReceiptRequested: boolean;
  isRead: boolean;
  isDraft: boolean;
  webLink: string;
  inferenceClassification: 'focused' | 'other';
  flag: {
    flagStatus: 'notFlagged' | 'complete' | 'flagged';
    startDateTime?: string;
    dueDateTime?: string;
    completedDateTime?: string;
  };
  categories: string[];
  conversationId: string;
  conversationIndex: string;
  internetMessageId: string;
  isFromMe: boolean;
  parentFolderId: string;
  uniqueBody: {
    content: string;
    contentType: 'text' | 'html';
  };
}

export interface OutlookEmailAddress {
  name: string;
  address: string;
}

export interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  lastModifiedDateTime: string;
  contentId?: string;
  contentLocation?: string;
  contentBytes?: string;
}

export interface OutlookEvent {
  id: string;
  subject: string;
  body: {
    content: string;
    contentType: 'text' | 'html';
  };
  bodyPreview: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location: {
    displayName: string;
    address?: {
      street: string;
      city: string;
      state: string;
      countryOrRegion: string;
      postalCode: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  locations: OutlookLocation[];
  attendees: OutlookAttendee[];
  organizer: OutlookEmailAddress;
  recurrence?: OutlookRecurrence;
  originalStart: string;
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  importance: 'low' | 'normal' | 'high';
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  type: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  webLink: string;
  onlineMeetingUrl?: string;
  onlineMeeting?: {
    joinUrl: string;
    conferenceId: string;
    tollNumber: string;
    tollFreeNumber: string;
    dialinUrl: string;
  };
  calendar: {
    id: string;
    name: string;
    color: string;
    owner: OutlookEmailAddress;
  };
  reminderMinutesBeforeStart: number;
  isReminderOn: boolean;
  hasAttachments: boolean;
  attachments: OutlookAttachment[];
  responseRequested: boolean;
  responseStatus: {
    response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
    time: string;
  };
  seriesMasterId?: string;
  hideAttendees: boolean;
  createdDateTime: string;
  lastModifiedDateTime: string;
  changeKey: string;
  categories: string[];
  transactionId?: string;
  isOnlineMeeting: boolean;
  onlineMeetingProvider: 'unknown' | 'skypeForBusiness' | 'skypeForConsumer' | 'teamsForBusiness';
  allowNewTimeProposals: boolean;
}

export interface OutlookLocation {
  displayName: string;
  locationType: 'default' | 'conferenceRoom' | 'homeAddress' | 'businessAddress' | 'geoCoordinates' | 'streetAddress' | 'hotel' | 'restaurant' | 'localBusiness' | 'postalAddress';
  uniqueId?: string;
  uniqueIdType?: 'unknown' | 'locationStore' | 'outlook' | 'private' | 'bing';
  address?: {
    street: string;
    city: string;
    state: string;
    countryOrRegion: string;
    postalCode: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface OutlookAttendee {
  emailAddress: OutlookEmailAddress;
  status: {
    response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
    time: string;
  };
  type: 'required' | 'optional' | 'resource';
}

export interface OutlookRecurrence {
  pattern: {
    type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
    interval: number;
    month?: number;
    dayOfMonth?: number;
    daysOfWeek?: string[];
    firstDayOfWeek?: string;
    index?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  };
  range: {
    type: 'endDate' | 'noEnd' | 'numbered';
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
  };
}

export interface OutlookFolder {
  id: string;
  displayName: string;
  parentFolderId: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  sizeInBytes: number;
  isHidden: boolean;
  wellKnownName?: 'archive' | 'clutter' | 'conflicts' | 'conversationHistory' | 'deleteditems' | 'drafts' | 'inbox' | 'junkemail' | 'localfailures' | 'msgfolderroot' | 'outbox' | 'recoverableitemsdeletions' | 'scheduled' | 'searchfolders' | 'sentitems' | 'serverfailures' | 'syncissues';
}

export interface OutlookCategory {
  id: string;
  displayName: string;
  color: 'none' | 'preset0' | 'preset1' | 'preset2' | 'preset3' | 'preset4' | 'preset5' | 'preset6' | 'preset7' | 'preset8' | 'preset9' | 'preset10' | 'preset11' | 'preset12' | 'preset13' | 'preset14' | 'preset15' | 'preset16' | 'preset17' | 'preset18' | 'preset19' | 'preset20' | 'preset21' | 'preset22' | 'preset23' | 'preset24';
}

export interface OutlookRule {
  id: string;
  displayName: string;
  sequence: number;
  isEnabled: boolean;
  conditions: OutlookRuleConditions;
  actions: OutlookRuleActions;
  exceptions?: OutlookRuleConditions;
  hasError: boolean;
  errorMessage?: string;
}

export interface OutlookRuleConditions {
  bodyContains?: string[];
  bodyOrSubjectContains?: string[];
  categories?: string[];
  fromAddresses?: OutlookEmailAddress[];
  hasAttachments?: boolean;
  headerContains?: string[];
  importance?: 'low' | 'normal' | 'high';
  isApprovalRequest?: boolean;
  isAutomaticForward?: boolean;
  isAutomaticReply?: boolean;
  isEncrypted?: boolean;
  isMeetingRequest?: boolean;
  isMeetingResponse?: boolean;
  isNonDeliveryReport?: boolean;
  isPermissionControlled?: boolean;
  isReadReceipt?: boolean;
  isSigned?: boolean;
  isVoicemail?: boolean;
  messageActionFlag?: 'any' | 'call' | 'doNotForward' | 'followUp' | 'fyi' | 'forward' | 'noResponseNecessary' | 'read' | 'reply' | 'replyToAll' | 'review';
  notSentToMe?: boolean;
  recipientContains?: string[];
  senderContains?: string[];
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  sentCcMe?: boolean;
  sentOnlyToMe?: boolean;
  sentToAddresses?: OutlookEmailAddress[];
  sentToMe?: boolean;
  sentToOrCcMe?: boolean;
  subjectContains?: string[];
  withinSizeRange?: {
    minimumSize?: number;
    maximumSize?: number;
  };
}

export interface OutlookRuleActions {
  assignCategories?: string[];
  copyToFolder?: string;
  delete?: boolean;
  forwardAsAttachmentTo?: OutlookEmailAddress[];
  forwardTo?: OutlookEmailAddress[];
  markAsRead?: boolean;
  markImportance?: 'low' | 'normal' | 'high';
  moveToFolder?: string;
  permanentDelete?: boolean;
  redirectTo?: OutlookEmailAddress[];
  stopProcessingRules?: boolean;
}