/**
 * DocuSign Types and Interfaces
 * All type definitions for DocuSign integration
 */

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface DocuSignAuth {
  integrationKey: string;
  secretKey: string;
  redirectUri: string;
  environment: 'demo' | 'production';
  accountId?: string;
  baseUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  userId?: string;
  consentScopes?: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface DocuSignResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId?: string;
}

export interface DocuSignError {
  errorCode: string;
  message: string;
  description?: string;
  moreInformation?: string;
  timestamp?: string;
}

// ============================================================================
// ENVELOPE TYPES
// ============================================================================

export interface EnvelopeDefinition {
  emailSubject: string;
  emailBlurb?: string;
  status?: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
  templateId?: string;
  templateRoles?: TemplateRole[];
  documents?: Document[];
  recipients?: Recipients;
  customFields?: CustomFields;
  eventNotification?: EventNotification;
  brandId?: string;
  allowReassign?: boolean;
  allowMarkup?: boolean;
  allowViewHistory?: boolean;
  envelopeIdStamping?: boolean;
  authoritativeCopy?: boolean;
  notification?: Notification;
  enforceSignerVisibility?: boolean;
  enableWetSign?: boolean;
  allowComments?: boolean;
  allowRecipientRecursion?: boolean;
  recipientViewRequest?: RecipientViewRequest;
  compositeTemplates?: CompositeTemplate[];
  accessControlListBase64?: string;
  workflow?: Workflow;
  expirations?: Expirations;
  reminders?: Reminders;
}

export interface EnvelopeSummary {
  envelopeId: string;
  status: string;
  statusDateTime: string;
  uri: string;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export interface Document {
  documentId: string;
  name: string;
  fileExtension?: string;
  documentBase64?: string;
  documentFields?: DocumentField[];
  encryptedWithKeyManager?: boolean;
  order?: string;
  pages?: string;
  uri?: string;
  remoteUrl?: string;
  transformPdfFields?: boolean;
  htmlDefinition?: HtmlDefinition;
}

export interface DocumentField {
  name: string;
  value: string;
}

export interface HtmlDefinition {
  source?: string;
  displayAnchorPrefix?: string;
  displayAnchors?: DisplayAnchor[];
  displayPageNumber?: string;
  displayOrder?: string;
  showMobileOptimizedToggle?: boolean;
}

export interface DisplayAnchor {
  startAnchor: string;
  endAnchor?: string;
  removeStartAnchor?: boolean;
  removeEndAnchor?: boolean;
  caseSensitive?: boolean;
  displaySettings?: DisplaySettings;
}

export interface DisplaySettings {
  display?: string;
  displayLabel?: string;
  displayOrder?: number;
  displayPageNumber?: number;
  hideLabelWhenOpened?: boolean;
  inlineOuterStyle?: string;
  labelWhenOpened?: string;
  preLabel?: string;
  scrollToTopWhenOpened?: boolean;
  tableStyle?: string;
}

// ============================================================================
// RECIPIENT TYPES
// ============================================================================

export interface Recipients {
  signers?: Signer[];
  carbonCopies?: CarbonCopy[];
  certifiedDeliveries?: CertifiedDelivery[];
  inPersonSigners?: InPersonSigner[];
  intermediaries?: Intermediary[];
  notaries?: Notary[];
  witnesses?: Witness[];
  editors?: Editor[];
  agents?: Agent[];
  recipientCount?: string;
  currentRoutingOrder?: string;
}

export interface BaseRecipient {
  recipientId: string;
  recipientIdGuid?: string;
  email?: string;
  name?: string;
  roleName?: string;
  note?: string;
  routingOrder?: string;
  status?: string;
  signedDateTime?: string;
  deliveredDateTime?: string;
  declinedDateTime?: string;
  sentDateTime?: string;
  declinedReason?: string;
  deliveryMethod?: 'email' | 'fax' | 'sms' | 'offline';
  faxNumber?: string;
  phoneNumber?: string;
  recipientType?: string;
  requireIdLookup?: boolean;
  idCheckConfigurationName?: string;
  socialAuthentications?: SocialAuthentication[];
  phoneAuthentication?: PhoneAuthentication;
  smsAuthentication?: SmsAuthentication;
  recipientAuthentication?: RecipientAuthentication;
  accessCode?: string;
  addAccessCodeToEmail?: boolean;
  embeddedRecipientStartURL?: string;
  errorDetails?: ErrorDetails;
  recipientAttachments?: RecipientAttachment[];
  recipientSignatureProviders?: RecipientSignatureProvider[];
  signatureInfo?: SignatureInfo;
  tabs?: Tabs;
}

export interface Signer extends BaseRecipient {
  signInEachLocation?: boolean;
  agentCanEditEmail?: boolean;
  agentCanEditName?: boolean;
  requireSignerCertificate?: string;
  requireSignOnPaper?: boolean;
  canSignOffline?: boolean;
  isBulkRecipient?: boolean;
  bulkRecipientsUri?: string;
  recipientSuppliesTabs?: boolean;
  excludedDocuments?: string[];
  autoNavigation?: boolean;
  defaultRecipient?: boolean;
}

export interface CarbonCopy extends BaseRecipient {
  agentCanEditEmail?: boolean;
  agentCanEditName?: boolean;
}

export interface CertifiedDelivery extends BaseRecipient {
  agentCanEditEmail?: boolean;
  agentCanEditName?: boolean;
}

export interface InPersonSigner extends BaseRecipient {
  hostEmail?: string;
  hostName?: string;
  signerEmail?: string;
  signerName?: string;
  autoNavigation?: boolean;
  defaultRecipient?: boolean;
}

export interface Intermediary extends BaseRecipient {}
export interface Notary extends BaseRecipient {}
export interface Witness extends BaseRecipient {}
export interface Editor extends BaseRecipient {}
export interface Agent extends BaseRecipient {}

export interface TemplateRole {
  email: string;
  name: string;
  roleName: string;
  clientUserId?: string;
  embeddedRecipientStartURL?: string;
  defaultRecipient?: boolean;
  accessCode?: string;
  phoneNumber?: string;
  routingOrder?: string;
  emailNotification?: EmailNotification;
  tabs?: Tabs;
}

// ============================================================================
// TAB TYPES
// ============================================================================

export interface Tabs {
  signHereTabs?: SignHereTab[];
  initialHereTabs?: InitialHereTab[];
  fullNameTabs?: FullNameTab[];
  emailTabs?: EmailTab[];
  textTabs?: TextTab[];
  numberTabs?: NumberTab[];
  dateTabs?: DateTab[];
  checkboxTabs?: CheckboxTab[];
  radioGroupTabs?: RadioGroupTab[];
  listTabs?: ListTab[];
  declineTabs?: DeclineTab[];
  formulaTabs?: FormulaTab[];
  noteTabs?: NoteTab[];
  approveTabs?: ApproveTab[];
  viewTabs?: ViewTab[];
  titleTabs?: TitleTab[];
  companyTabs?: CompanyTab[];
  dateSignedTabs?: DateSignedTab[];
  drawTabs?: DrawTab[];
  signatureProviderTabs?: SignatureProviderTab[];
  signerAttachmentTabs?: SignerAttachmentTab[];
  smartSectionTabs?: SmartSectionTab[];
  notarizeTabs?: NotarizeTab[];
  polyLineOverlayTabs?: PolyLineOverlayTab[];
  prefillTabs?: PrefillTabs;
}

export interface BaseTab {
  documentId?: string;
  recipientId?: string;
  pageNumber?: string;
  xPosition?: string;
  yPosition?: string;
  anchorString?: string;
  anchorXOffset?: string;
  anchorYOffset?: string;
  anchorUnits?: 'pixels' | 'inches' | 'mms' | 'cms';
  anchorIgnoreIfNotPresent?: boolean;
  anchorCaseSensitive?: boolean;
  anchorMatchWholeWord?: boolean;
  anchorHorizontalAlignment?: string;
  tabId?: string;
  tabLabel?: string;
  tabOrder?: string;
  templateLocked?: boolean;
  templateRequired?: boolean;
  conditionalParentLabel?: string;
  conditionalParentValue?: string;
  customTabId?: string;
  mergeField?: MergeField;
  status?: string;
  errorDetails?: ErrorDetails;
  width?: number;
  height?: number;
  tooltip?: string;
}

export interface SignHereTab extends BaseTab {
  optional?: boolean;
  scaleValue?: number;
  stampType?: string;
  stampTypeMetadata?: PropertyMetadata;
  isSealSignTab?: boolean;
}

export interface InitialHereTab extends BaseTab {
  optional?: boolean;
  scaleValue?: number;
}

export interface TextTab extends BaseTab {
  value?: string;
  locked?: boolean;
  required?: boolean;
  maxLength?: number;
  font?: string;
  fontSize?: string;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  concealValueOnDocument?: boolean;
  disableAutoSize?: boolean;
  formula?: string;
  isPaymentAmount?: boolean;
  validationMessage?: string;
  validationPattern?: string;
  shared?: boolean;
  requireInitialOnSharedChange?: boolean;
  senderRequired?: boolean;
}

export interface FullNameTab extends BaseTab {}
export interface EmailTab extends TextTab {}
export interface NumberTab extends TextTab {}
export interface DateTab extends TextTab {}

export interface CheckboxTab extends BaseTab {
  selected?: boolean;
  locked?: boolean;
  required?: boolean;
  shared?: boolean;
  requireInitialOnSharedChange?: boolean;
}

export interface RadioGroupTab extends BaseTab {
  groupName?: string;
  radios?: Radio[];
  shared?: boolean;
  requireInitialOnSharedChange?: boolean;
}

export interface Radio {
  pageNumber?: string;
  xPosition?: string;
  yPosition?: string;
  anchorString?: string;
  anchorXOffset?: string;
  anchorYOffset?: string;
  anchorUnits?: string;
  value?: string;
  selected?: boolean;
  required?: boolean;
  locked?: boolean;
  tabId?: string;
  tabOrder?: string;
  errorDetails?: ErrorDetails;
}

export interface ListTab extends BaseTab {
  listItems?: ListItem[];
  value?: string;
  required?: boolean;
  locked?: boolean;
  shared?: boolean;
  requireInitialOnSharedChange?: boolean;
  senderRequired?: boolean;
}

export interface ListItem {
  text?: string;
  value?: string;
  selected?: boolean;
}

export interface DeclineTab extends BaseTab {
  buttonText?: string;
  declineReason?: string;
}

export interface FormulaTab extends BaseTab {
  formula?: string;
  roundDecimalPlaces?: number;
  required?: boolean;
  locked?: boolean;
  concealValueOnDocument?: boolean;
  disableAutoSize?: boolean;
  isPaymentAmount?: boolean;
  formulaMetadata?: PropertyMetadata;
  paymentDetails?: PaymentDetails;
  validationMessage?: string;
  validationPattern?: string;
  senderRequired?: boolean;
}

export interface NoteTab extends BaseTab {
  value?: string;
  font?: string;
  fontSize?: string;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  shared?: boolean;
}

export interface ApproveTab extends BaseTab {
  buttonText?: string;
}

export interface ViewTab extends BaseTab {
  buttonText?: string;
  required?: boolean;
}

export interface TitleTab extends TextTab {}
export interface CompanyTab extends TextTab {}

export interface DateSignedTab extends BaseTab {
  font?: string;
  fontSize?: string;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface DrawTab extends BaseTab {
  allowSignerUpload?: boolean;
  required?: boolean;
  scaleValue?: number;
  optional?: boolean;
}

export interface SignatureProviderTab extends BaseTab {
  signatureProviderName?: string;
  signatureProviderOptions?: SignatureProviderOptions;
}

export interface SignerAttachmentTab extends BaseTab {
  optional?: boolean;
  required?: boolean;
  scaleValue?: number;
}

export interface SmartSectionTab extends BaseTab {
  displayLabel?: string;
  locked?: boolean;
  required?: boolean;
  caseSensitive?: boolean;
  removeEmptyTags?: boolean;
  endAnchor?: string;
  startAnchor?: string;
}

export interface NotarizeTab extends BaseTab {
  locked?: boolean;
  required?: boolean;
}

export interface PolyLineOverlayTab extends BaseTab {}

export interface PrefillTabs {
  textTabs?: TextTab[];
  checkboxTabs?: CheckboxTab[];
  radioGroupTabs?: RadioGroupTab[];
  listTabs?: ListTab[];
  dateTabs?: DateTab[];
  ssnTabs?: SsnTab[];
  zipTabs?: ZipTab[];
  emailTabs?: EmailTab[];
  numberTabs?: NumberTab[];
}

export interface SsnTab extends TextTab {
  validationPattern?: string;
  validationMessage?: string;
}

export interface ZipTab extends TextTab {
  useDash4?: boolean;
}

// ============================================================================
// CUSTOM FIELDS
// ============================================================================

export interface CustomFields {
  textCustomFields?: TextCustomField[];
  listCustomFields?: ListCustomField[];
}

export interface TextCustomField {
  name: string;
  value: string;
  required?: boolean;
  show?: boolean;
  configurationName?: string;
  fieldId?: string;
}

export interface ListCustomField {
  name: string;
  value: string;
  listItems?: string[];
  required?: boolean;
  show?: boolean;
  configurationName?: string;
  fieldId?: string;
}

// ============================================================================
// EVENT NOTIFICATION (WEBHOOKS)
// ============================================================================

export interface EventNotification {
  url: string;
  loggingEnabled?: boolean;
  requireAcknowledgment?: boolean;
  useSoapInterface?: boolean;
  soapNameSpace?: string;
  includeCertificateWithSoap?: boolean;
  signMessageWithX509Cert?: boolean;
  includeDocuments?: boolean;
  includeEnvelopeVoidReason?: boolean;
  includeTimeZone?: boolean;
  includeSenderAccountAsCustomField?: boolean;
  includeDocumentFields?: boolean;
  includeCertificateOfCompletion?: boolean;
  envelopeEvents?: EnvelopeEvent[];
  recipientEvents?: RecipientEvent[];
  eventData?: EventData;
  deliveryMode?: 'SIM' | 'Aggregate';
}

export interface EnvelopeEvent {
  envelopeEventStatusCode: string;
  includeDocuments?: boolean;
}

export interface RecipientEvent {
  recipientEventStatusCode: string;
  includeDocuments?: boolean;
}

export interface EventData {
  version?: string;
  format?: string;
  includeData?: string[];
}

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

export interface Notification {
  useAccountDefaults?: boolean;
  reminders?: Reminders;
  expirations?: Expirations;
}

export interface Reminders {
  reminderEnabled?: boolean;
  reminderDelay?: string;
  reminderFrequency?: string;
}

export interface Expirations {
  expireEnabled?: boolean;
  expireAfter?: string;
  expireWarn?: string;
}

// ============================================================================
// RECIPIENT VIEW (EMBEDDED SIGNING)
// ============================================================================

export interface RecipientViewRequest {
  returnUrl: string;
  authenticationMethod?: string;
  email?: string;
  userName?: string;
  recipientId?: string;
  clientUserId?: string;
  pingFrequency?: string;
  pingUrl?: string;
  frameAncestors?: string[];
  messageOrigins?: string[];
  assertionId?: string;
  authenticationInstant?: string;
  securityDomain?: string;
  xFrameOptions?: string;
  xFrameOptionsAllowFromUrl?: string;
}

export interface RecipientViewResponse {
  url: string;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface Template {
  templateId?: string;
  name?: string;
  description?: string;
  shared?: boolean;
  password?: string;
  pageCount?: number;
  folderName?: string;
  folderId?: string;
  folderUri?: string;
  owner?: UserInfo;
  emailSubject?: string;
  emailBlurb?: string;
  created?: string;
  lastModified?: string;
  lastUsed?: string;
  uri?: string;
  documents?: Document[];
  recipients?: Recipients;
  customFields?: CustomFields;
  notification?: Notification;
  brandId?: string;
  allowMarkup?: boolean;
  allowReassign?: boolean;
  allowViewHistory?: boolean;
  asynchronous?: boolean;
  authoritativeCopy?: boolean;
  autoMatch?: boolean;
  autoMatchSpecifiedByUser?: boolean;
  certificateUri?: string;
  completedDateTime?: string;
  copyRecipientData?: boolean;
  createdDateTime?: string;
  declinedDateTime?: string;
  deletedDateTime?: string;
  deliveredDateTime?: string;
  disableResponsiveDocument?: boolean;
  documentsCombinedUri?: string;
  documentsUri?: string;
  enableWetSign?: boolean;
  enforceSignerVisibility?: boolean;
  envelopeIdStamping?: boolean;
  envelopeUri?: string;
  initialSentDateTime?: string;
  is21CFRPart11?: boolean;
  isSignatureProviderEnvelope?: boolean;
  lastModifiedDateTime?: string;
  lockInformation?: LockInformation;
  messageLock?: boolean;
  notificationUri?: string;
  powerForm?: PowerForm;
  purgeCompletedDate?: string;
  purgeRequestDate?: string;
  purgeState?: string;
  recipientsLock?: boolean;
  recipientsUri?: string;
  sender?: UserInfo;
  sentDateTime?: string;
  signerCanSignOnMobile?: boolean;
  signingLocation?: string;
  status?: string;
  statusChangedDateTime?: string;
  statusDateTime?: string;
  transactionId?: string;
  useDisclosure?: boolean;
  voidedDateTime?: string;
  voidedReason?: string;
  workflow?: Workflow;
}

// ============================================================================
// COMPOSITE TEMPLATE TYPES
// ============================================================================

export interface CompositeTemplate {
  compositeTemplateId: string;
  serverTemplates?: ServerTemplate[];
  inlineTemplates?: InlineTemplate[];
  pdfMetaDataTemplateSequence?: string;
  document?: Document;
}

export interface ServerTemplate {
  sequence: string;
  templateId: string;
}

export interface InlineTemplate {
  sequence: string;
  envelope?: EnvelopeDefinition;
  recipients?: Recipients;
  customFields?: CustomFields;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export interface Workflow {
  workflowSteps?: WorkflowStep[];
  currentWorkflowStepId?: string;
}

export interface WorkflowStep {
  action?: string;
  completedDate?: string;
  itemId?: string;
  recipientId?: string;
  status?: string;
  triggeredDate?: string;
  triggerOnItem?: string;
  workflowStepId?: string;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface EmailNotification {
  emailSubject?: string;
  emailBody?: string;
  supportedLanguage?: string;
}

export interface SocialAuthentication {
  authentication?: string;
}

export interface PhoneAuthentication {
  recipMayProvideNumber?: boolean;
  validateRecipProvidedNumber?: boolean;
  recordVoicePrint?: boolean;
  senderProvidedNumbers?: string[];
  style?: string;
}

export interface SmsAuthentication {
  senderProvidedNumbers?: string[];
}

export interface RecipientAuthentication {
  authenticationMethod?: string;
  lastUsedDateTime?: string;
  lastUsedIPAddress?: string;
  authenticationStatus?: string;
  totalSignedCount?: number;
}

export interface RecipientAttachment {
  attachmentId?: string;
  label?: string;
  attachmentType?: string;
  data?: string;
  name?: string;
  remoteUrl?: string;
}

export interface RecipientSignatureProvider {
  signatureProviderName?: string;
  signatureProviderOptions?: SignatureProviderOptions;
}

export interface SignatureProviderOptions {
  cpfNumber?: string;
  cpfNumberMetadata?: PropertyMetadata;
  oneTimePassword?: string;
  oneTimePasswordMetadata?: PropertyMetadata;
  signerRole?: string;
  signerRoleMetadata?: PropertyMetadata;
  sms?: string;
  smsMetadata?: PropertyMetadata;
}

export interface SignatureInfo {
  signatureName?: string;
  signatureInitials?: string;
  fontStyle?: string;
  signatureId?: string;
  stampName?: string;
  stampFormat?: string;
  dateStampProperties?: DateStampProperties;
}

export interface DateStampProperties {
  dateAreaFormat?: string;
  dateAreaHeight?: string;
  dateAreaWidth?: string;
  dateAreaX?: string;
  dateAreaY?: string;
}

export interface ErrorDetails {
  errorCode?: string;
  message?: string;
}

export interface MergeField {
  allowSenderToEdit?: boolean;
  allowSenderToEditMetadata?: PropertyMetadata;
  configurationType?: string;
  configurationTypeMetadata?: PropertyMetadata;
  path?: string;
  pathExtended?: PathExtendedElement[];
  pathExtendedMetadata?: PropertyMetadata;
  pathMetadata?: PropertyMetadata;
  row?: string;
  rowMetadata?: PropertyMetadata;
  writeBack?: boolean;
  writeBackMetadata?: PropertyMetadata;
}

export interface PathExtendedElement {
  contextType?: string;
  contextTypeMetadata?: PropertyMetadata;
  path?: string;
  pathMetadata?: PropertyMetadata;
}

export interface PropertyMetadata {
  options?: string[];
  rights?: string;
}

export interface PaymentDetails {
  allowedPaymentMethods?: string[];
  chargeId?: string;
  currencyCode?: string;
  currencyCodeMetadata?: PropertyMetadata;
  customerId?: string;
  customMetadata?: string;
  customMetadataRequired?: boolean;
  gatewayAccountId?: string;
  gatewayAccountIdMetadata?: PropertyMetadata;
  gatewayDisplayName?: string;
  gatewayName?: string;
  lineItems?: PaymentLineItem[];
  paymentOption?: string;
  paymentSourceId?: string;
  payerInfo?: PaymentSignerValues;
  paymentFormValues?: PaymentFormValues;
  paymentMethodOptions?: PaymentMethodOptions;
  status?: string;
  subGatewayName?: string;
  total?: Money;
}

export interface PaymentLineItem {
  amountReference?: string;
  description?: string;
  itemCode?: string;
  itemName?: string;
  itemQuantity?: string;
  itemUnitPrice?: string;
  measurementUnitCode?: string;
  name?: string;
  quantity?: string;
  taxAmount?: string;
  taxExemptAmount?: string;
  taxRate?: string;
  totalAmount?: string;
  unitOfMeasure?: string;
  unitPrice?: string;
}

export interface PaymentSignerValues {
  paymentOption?: string;
}

export interface PaymentFormValues {
  [key: string]: string;
}

export interface PaymentMethodOptions {
  [key: string]: any;
}

export interface Money {
  amountInBaseUnit?: string;
  currency?: string;
  displayAmount?: string;
}

export interface UserInfo {
  accountId?: string;
  accountName?: string;
  activationAccessCode?: string;
  email?: string;
  errorDetails?: ErrorDetails;
  loginStatus?: string;
  membershipId?: string;
  sendActivationEmail?: boolean;
  uri?: string;
  userId?: string;
  userName?: string;
  userStatus?: string;
  userType?: string;
}

export interface LockInformation {
  lockedByUser?: UserInfo;
  lockedByApp?: string;
  lockedUntilDateTime?: string;
  lockDurationInSeconds?: string;
  lockType?: string;
  useScratchPad?: boolean;
  lockToken?: string;
}

export interface PowerForm {
  powerFormId?: string;
  powerFormUrl?: string;
}

// ============================================================================
// BULK SEND TYPES
// ============================================================================

export interface BulkSendRequest {
  name?: string;
  envelopeOrTemplateId?: string;
  recipients?: BulkSendingList;
}

export interface BulkSendingList {
  bulkSendingListId?: string;
  name?: string;
  bulkCopies?: BulkSendingCopy[];
}

export interface BulkSendingCopy {
  recipients?: BulkSendingCopyRecipient[];
  customFields?: BulkSendingCopyCustomField[];
}

export interface BulkSendingCopyRecipient {
  roleName?: string;
  name?: string;
  email?: string;
  note?: string;
  accessCode?: string;
  clientUserId?: string;
  embeddedRecipientStartURL?: string;
  defaultRecipient?: string;
  phoneNumber?: BulkSendingCopyPhoneNumber;
  recipientSignatureProviderInfo?: BulkSendingCopyRecipientSignatureProviderInfo[];
  tabs?: BulkSendingCopyTabLabel[];
}

export interface BulkSendingCopyPhoneNumber {
  countryCode?: string;
  number?: string;
}

export interface BulkSendingCopyRecipientSignatureProviderInfo {
  name?: string;
  value?: string;
}

export interface BulkSendingCopyTabLabel {
  name?: string;
  value?: string;
}

export interface BulkSendingCopyCustomField {
  name?: string;
  value?: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface DocuSignConfig {
  auth: DocuSignAuth;
  webhooksEnabled: boolean;
  embeddedSigningEnabled: boolean;
  bulkSendEnabled: boolean;
  templatesEnabled: boolean;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface DocuSignStats {
  totalEnvelopes: number;
  sentEnvelopes: number;
  completedEnvelopes: number;
  voidedEnvelopes: number;
  declinedEnvelopes: number;
  totalTemplates: number;
  webhooksReceived: number;
  webhooksProcessed: number;
  bulkSendJobs: number;
  averageCompletionTime: number;
  lastError?: DocuSignError;
}
