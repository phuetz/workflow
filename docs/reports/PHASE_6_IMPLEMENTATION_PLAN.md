# Phase 6: Top 20 Critical Integrations
## Implementation Plan - PROJET SAUVÉ

**Objective:** Implement the 20 most critical integrations to close the gap with n8n
**Time Allocated:** 12-15 hours (of remaining 20.5 hours)
**Current Status:** Planning Complete, Ready to Implement

---

## 🎯 Integration Priorities

### Priority 1: Communication (4 integrations, ~4 hours)

#### 1. Slack (Estimation: 1.5h)
**Operations:**
- Send Message to Channel
- Send Direct Message
- Upload File
- Get Channel List
- Get User Info
- Create Channel
- Archive Channel
- Add Reaction

**Auth:** OAuth 2.0 + Bot Token
**Files to Create:**
- `SlackConfig.tsx` (enhanced existing)
- `src/integrations/slack/SlackClient.ts`
- `src/integrations/slack/slack.types.ts`

---

#### 2. Discord (Estimation: 1h)
**Operations:**
- Send Message to Channel
- Send Webhook Message
- Create Embed
- Add Reaction
- Get Server Info
- Get Channel List
- Manage Roles
- Send DM

**Auth:** Bot Token + Webhooks
**Files to Create:**
- `DiscordConfig.tsx`
- `src/integrations/discord/DiscordClient.ts`
- `src/integrations/discord/discord.types.ts`

---

#### 3. Microsoft Teams (Estimation: 1h)
**Operations:**
- Send Message to Channel
- Create Channel
- Get Team Members
- Send Adaptive Card
- Upload File
- Get Chat Messages

**Auth:** OAuth 2.0 (Microsoft Graph API)
**Files to Create:**
- `TeamsConfig.tsx`
- `src/integrations/teams/TeamsClient.ts`
- `src/integrations/teams/teams.types.ts`

---

#### 4. Twilio (Estimation: 0.5h)
**Operations:**
- Send SMS
- Make Voice Call
- Send WhatsApp Message
- Get Message Status
- Get Call Logs

**Auth:** Account SID + Auth Token
**Files to Create:**
- `TwilioConfig.tsx`
- `src/integrations/twilio/TwilioClient.ts`
- `src/integrations/twilio/twilio.types.ts`

---

### Priority 2: CRM (4 integrations, ~4 hours)

#### 5. Salesforce (Estimation: 1.5h)
**Operations:**
- Create/Update Lead
- Create/Update Contact
- Create/Update Account
- Create/Update Opportunity
- Search Records (SOQL)
- Get Record by ID
- Delete Record

**Auth:** OAuth 2.0 (Salesforce)
**Files to Create:**
- `SalesforceConfig.tsx`
- `src/integrations/salesforce/SalesforceClient.ts`
- `src/integrations/salesforce/salesforce.types.ts`

---

#### 6. HubSpot (Estimation: 1h)
**Operations:**
- Create/Update Contact
- Create/Update Company
- Create/Update Deal
- Get Contact by Email
- Search Records
- Add to List
- Track Event

**Auth:** API Key + OAuth 2.0
**Files to Create:**
- `HubSpotConfig.tsx`
- `src/integrations/hubspot/HubSpotClient.ts`
- `src/integrations/hubspot/hubspot.types.ts`

---

#### 7. Pipedrive (Estimation: 1h)
**Operations:**
- Create/Update Deal
- Create/Update Person
- Create/Update Organization
- Get Deals
- Move Deal Stage
- Add Activity
- Add Note

**Auth:** API Token
**Files to Create:**
- `PipedriveConfig.tsx`
- `src/integrations/pipedrive/PipedriveClient.ts`
- `src/integrations/pipedrive/pipedrive.types.ts`

---

#### 8. Airtable (Estimation: 0.5h)
**Operations:**
- Create Record
- Update Record
- Get Record
- List Records
- Delete Record
- Search Records

**Auth:** API Key / Personal Access Token
**Files to Create:**
- `AirtableConfig.tsx`
- `src/integrations/airtable/AirtableClient.ts`
- `src/integrations/airtable/airtable.types.ts`

---

### Priority 3: E-commerce (4 integrations, ~3.5 hours)

#### 9. Shopify (Estimation: 1.5h)
**Operations:**
- Create/Update Product
- Get Product
- List Products
- Create/Update Order
- Get Order
- List Orders
- Create Customer
- Get Customer
- Fulfill Order

**Auth:** OAuth 2.0 + API Key
**Files to Create:**
- `ShopifyConfig.tsx`
- `src/integrations/shopify/ShopifyClient.ts`
- `src/integrations/shopify/shopify.types.ts`

---

#### 10. Stripe (Estimation: 1h)
**Operations:**
- Create Payment Intent
- Create Customer
- Create Subscription
- Cancel Subscription
- Get Payment
- List Charges
- Create Invoice
- Refund Payment

**Auth:** API Secret Key
**Files to Create:**
- `StripeConfig.tsx`
- `src/integrations/stripe/StripeClient.ts`
- `src/integrations/stripe/stripe.types.ts`

---

#### 11. PayPal (Estimation: 0.5h)
**Operations:**
- Create Payment
- Execute Payment
- Get Payment Status
- Create Invoice
- Send Invoice
- Refund Payment

**Auth:** OAuth 2.0 (Client ID + Secret)
**Files to Create:**
- `PayPalConfig.tsx`
- `src/integrations/paypal/PayPalClient.ts`
- `src/integrations/paypal/paypal.types.ts`

---

#### 12. WooCommerce (Estimation: 0.5h)
**Operations:**
- Create/Update Product
- Get Product
- List Products
- Create/Update Order
- Get Order
- List Orders
- Update Order Status

**Auth:** Consumer Key + Consumer Secret
**Files to Create:**
- `WooCommerceConfig.tsx`
- `src/integrations/woocommerce/WooCommerceClient.ts`
- `src/integrations/woocommerce/woocommerce.types.ts`

---

### Priority 4: Marketing (4 integrations, ~3 hours)

#### 13. Mailchimp (Estimation: 1h)
**Operations:**
- Add Subscriber to List
- Update Subscriber
- Remove Subscriber
- Create Campaign
- Send Campaign
- Get Campaign Stats
- Create Template

**Auth:** API Key + OAuth 2.0
**Files to Create:**
- `MailchimpConfig.tsx`
- `src/integrations/mailchimp/MailchimpClient.ts`
- `src/integrations/mailchimp/mailchimp.types.ts`

---

#### 14. SendGrid (Estimation: 0.5h)
**Operations:**
- Send Email
- Send Template Email
- Add Contact
- Create List
- Add to List
- Schedule Email

**Auth:** API Key
**Files to Create:**
- `SendGridConfig.tsx`
- `src/integrations/sendgrid/SendGridClient.ts`
- `src/integrations/sendgrid/sendgrid.types.ts`

---

#### 15. Google Analytics (Estimation: 1h)
**Operations:**
- Track Event
- Track Pageview
- Get Report Data
- Get Real-time Data
- Create Custom Report
- Get Audience Data

**Auth:** OAuth 2.0 (Google)
**Files to Create:**
- `GoogleAnalyticsConfig.tsx`
- `src/integrations/google-analytics/GoogleAnalyticsClient.ts`
- `src/integrations/google-analytics/analytics.types.ts`

---

#### 16. Facebook/Meta Ads (Estimation: 0.5h)
**Operations:**
- Create Campaign
- Get Campaign Stats
- Create Ad Set
- Create Ad
- Get Ad Insights
- Update Budget

**Auth:** OAuth 2.0 (Facebook)
**Files to Create:**
- `FacebookAdsConfig.tsx`
- `src/integrations/facebook-ads/FacebookAdsClient.ts`
- `src/integrations/facebook-ads/facebook.types.ts`

---

### Priority 5: Storage (4 integrations, ~3 hours)

#### 17. Google Drive (Estimation: 1h)
**Operations:**
- Upload File
- Download File
- Create Folder
- List Files
- Share File
- Delete File
- Move File
- Get File Info

**Auth:** OAuth 2.0 (Google)
**Files to Create:**
- `GoogleDriveConfig.tsx`
- `src/integrations/google-drive/GoogleDriveClient.ts`
- `src/integrations/google-drive/drive.types.ts`

---

#### 18. Dropbox (Estimation: 1h)
**Operations:**
- Upload File
- Download File
- Create Folder
- List Files
- Share File
- Delete File
- Move File
- Get File Metadata

**Auth:** OAuth 2.0 (Dropbox)
**Files to Create:**
- `DropboxConfig.tsx`
- `src/integrations/dropbox/DropboxClient.ts`
- `src/integrations/dropbox/dropbox.types.ts`

---

#### 19. AWS S3 (Estimation: 0.5h)
**Operations:**
- Upload Object
- Download Object
- List Objects
- Delete Object
- Copy Object
- Create Bucket
- List Buckets
- Set Object ACL

**Auth:** Access Key + Secret Key
**Files to Create:**
- `AWSS3Config.tsx`
- `src/integrations/aws-s3/S3Client.ts`
- `src/integrations/aws-s3/s3.types.ts`

---

#### 20. OneDrive (Estimation: 0.5h)
**Operations:**
- Upload File
- Download File
- Create Folder
- List Files
- Share File
- Delete File
- Move File
- Get File Info

**Auth:** OAuth 2.0 (Microsoft)
**Files to Create:**
- `OneDriveConfig.tsx`
- `src/integrations/onedrive/OneDriveClient.ts`
- `src/integrations/onedrive/onedrive.types.ts`

---

## 📁 Architecture

### Directory Structure
```
src/
├── integrations/           # NEW: All integration clients
│   ├── slack/
│   │   ├── SlackClient.ts
│   │   └── slack.types.ts
│   ├── discord/
│   ├── teams/
│   ├── twilio/
│   ├── salesforce/
│   ├── hubspot/
│   ├── pipedrive/
│   ├── airtable/
│   ├── shopify/
│   ├── stripe/
│   ├── paypal/
│   ├── woocommerce/
│   ├── mailchimp/
│   ├── sendgrid/
│   ├── google-analytics/
│   ├── facebook-ads/
│   ├── google-drive/
│   ├── dropbox/
│   ├── aws-s3/
│   └── onedrive/
├── workflow/
│   └── nodes/
│       └── config/         # Node configurations
│           ├── SlackConfig.tsx (enhance existing)
│           ├── DiscordConfig.tsx
│           ├── TeamsConfig.tsx
│           ├── TwilioConfig.tsx
│           ├── SalesforceConfig.tsx
│           ├── HubSpotConfig.tsx
│           ├── PipedriveConfig.tsx
│           ├── AirtableConfig.tsx
│           ├── ShopifyConfig.tsx
│           ├── StripeConfig.tsx
│           ├── PayPalConfig.tsx
│           ├── WooCommerceConfig.tsx
│           ├── MailchimpConfig.tsx
│           ├── SendGridConfig.tsx
│           ├── GoogleAnalyticsConfig.tsx
│           ├── FacebookAdsConfig.tsx
│           ├── GoogleDriveConfig.tsx
│           ├── DropboxConfig.tsx
│           ├── AWSS3Config.tsx
│           └── OneDriveConfig.tsx
```

---

## 🔧 Implementation Pattern

Each integration follows the same pattern:

### 1. Type Definitions (xxx.types.ts)
```typescript
export interface XxxCredentials {
  apiKey?: string;
  accessToken?: string;
  // ... other credentials
}

export interface XxxOperation {
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  resource: string;
  parameters: Record<string, unknown>;
}

export interface XxxResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

### 2. API Client (XxxClient.ts)
```typescript
export class XxxClient {
  private credentials: XxxCredentials;
  private baseUrl: string;

  constructor(credentials: XxxCredentials) {
    this.credentials = credentials;
    this.baseUrl = 'https://api.xxx.com';
  }

  async executeOperation(operation: XxxOperation): Promise<XxxResponse> {
    // Implementation
  }

  // Specific methods
  async create(resource: string, data: unknown): Promise<XxxResponse> {}
  async update(id: string, data: unknown): Promise<XxxResponse> {}
  async get(id: string): Promise<XxxResponse> {}
  async list(params: unknown): Promise<XxxResponse> {}
  async delete(id: string): Promise<XxxResponse> {}
}
```

### 3. Node Configuration (XxxConfig.tsx)
```typescript
export const XxxConfig: React.FC<NodeConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation || 'create');
  const [resource, setResource] = useState(config.resource || '');

  return (
    <div className="xxx-config space-y-4">
      <div className="font-semibold text-lg">Xxx Configuration</div>

      {/* Operation selector */}
      <select value={operation} onChange={handleOperationChange}>
        <option value="create">Create</option>
        <option value="update">Update</option>
        <option value="get">Get</option>
        <option value="list">List</option>
        <option value="delete">Delete</option>
      </select>

      {/* Resource-specific configuration */}
      {operation === 'create' && (
        <div>...</div>
      )}

      {/* Examples */}
      <div className="bg-blue-50 p-3 rounded">
        <strong>💡 Examples:</strong>
        {/* ... */}
      </div>
    </div>
  );
};
```

### 4. Registration
Update `nodeConfigRegistry.ts`:
```typescript
import { XxxConfig } from './nodes/config/XxxConfig';

const registry: Record<string, React.ComponentType<Record<string, unknown>>> = {
  // ...
  xxx: XxxConfig,
};
```

---

## ✅ Success Criteria

For each integration:
- [ ] API Client implemented with error handling
- [ ] Type definitions complete
- [ ] Node configuration UI functional
- [ ] Registered in nodeConfigRegistry
- [ ] At least 5 common operations supported
- [ ] Auth handling implemented
- [ ] Examples provided in UI
- [ ] TypeScript strict mode compliant

---

## 📊 Expected Impact

### Before Phase 6
- **Integrations:** 25
- **Gap vs n8n:** 23%

### After Phase 6 (20 new integrations)
- **Integrations:** 45 (+20)
- **Gap vs n8n:** ~15% (-8%)
- **Integration Coverage:** 11% (45/400)

### Target After Full Implementation
- Need ~100 critical integrations for 80% use case coverage
- Remaining 80 integrations in later phases

---

## 🚀 Execution Strategy

### Batch Processing
Work in batches by priority:
1. **Batch 1 (Hours 10-14):** Communication (Slack, Discord, Teams, Twilio)
2. **Batch 2 (Hours 14-18):** CRM (Salesforce, HubSpot, Pipedrive, Airtable)
3. **Batch 3 (Hours 18-21):** E-commerce (Shopify, Stripe, PayPal, WooCommerce)
4. **Batch 4 (Hours 21-24):** Marketing (Mailchimp, SendGrid, Google Analytics, Facebook)
5. **Batch 5 (Hours 24-27):** Storage (Google Drive, Dropbox, AWS S3, OneDrive)

### Quality Gates
After each batch:
- ✅ Verify TypeScript compilation
- ✅ Test node configuration UI
- ✅ Check registration
- ✅ Update progress report

---

## 📝 Documentation

Each integration will include:
- Operation descriptions in UI
- Example configurations
- Common use cases
- Authentication setup guide
- Error handling notes

---

**Ready to Start:** Batch 1 - Communication Integrations

**Next Action:** Implement Slack integration (enhanced)

**Time Remaining:** 20.5 hours
**Target Completion:** Phase 6 complete in 12-15 hours
