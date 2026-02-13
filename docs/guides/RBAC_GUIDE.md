# RBAC & Permissions Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Permission Hierarchy](#permission-hierarchy)
3. [Roles & Permissions](#roles--permissions)
4. [Credential Sharing](#credential-sharing)
5. [API Usage](#api-usage)
6. [Middleware](#middleware)
7. [Best Practices](#best-practices)

---

## Overview

Enterprise-grade **Role-Based Access Control (RBAC)** system with:

- ✅ **6-level permission hierarchy**
- ✅ **Granular credential sharing** with expiration & usage limits
- ✅ **Resource-level permissions** for any resource type
- ✅ **User groups** for department-level access
- ✅ **Team permissions** for collaboration
- ✅ **Audit trail** for all access

---

## Permission Hierarchy

Permissions are checked in this order (first match wins):

```
1. OWNER (Direct ownership)
   └─ User owns the resource → ✅ ALLOW

2. ROLE-BASED
   ├─ ADMIN → All permissions
   ├─ USER → Own resources + shared
   └─ VIEWER → Read-only

3. DIRECT PERMISSIONS
   └─ Explicitly granted on specific resource

4. SHARES
   └─ Resource shared with user

5. GROUPS
   └─ User group has permission

6. TEAMS
   └─ Team member with permission
```

---

## Roles & Permissions

### System Roles

| Role | Description | Default Permissions |
|------|-------------|---------------------|
| **ADMIN** | Full system access | All resources: create, read, update, delete, execute, share |
| **USER** | Standard user | Own resources: full control<br>Shared resources: as granted |
| **VIEWER** | Read-only access | Read-only on accessible resources |

### Credential Permissions

| Permission | Can View | Can Use | Can Edit | Can Delete | Can Share |
|------------|----------|---------|----------|------------|-----------|
| **READ** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **USE** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **EDIT** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **DELETE** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **SHARE** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |

### Resource Types

- **WORKFLOW** - Workflow automation
- **CREDENTIAL** - API keys, tokens, secrets
- **EXECUTION** - Workflow execution history
- **WEBHOOK** - Webhook endpoints
- **TEAM** - Team management
- **USER_GROUP** - User groups
- **FILE** - File storage

---

## Credential Sharing

### Share Credential

```typescript
import { getRBACService } from './backend/services/RBACService';
import { CredentialPermission } from '@prisma/client';

const rbac = getRBACService();

// Share with permissions
const result = await rbac.shareCredential({
  credentialId: 'cred_123',
  ownerId: 'user_owner',
  sharedWithId: 'user_recipient',
  permissions: [
    CredentialPermission.READ,
    CredentialPermission.USE
  ],
  expiresAt: new Date('2025-12-31'),  // Optional expiration
  maxUses: 100                         // Optional usage limit
});

if (result.success) {
  console.log('Shared successfully:', result.shareId);
}
```

### Revoke Share

```typescript
const result = await rbac.revokeCredentialShare(
  'cred_123',        // credentialId
  'user_recipient',  // sharedWithId
  'user_owner'       // ownerId
);
```

### List Shared Access

```typescript
const result = await rbac.listCredentialAccess(
  'cred_123',    // credentialId
  'user_owner'   // ownerId
);

console.log('Shares:', result.shares);
// [
//   {
//     userId: 'user_recipient',
//     email: 'user@example.com',
//     permissions: ['READ', 'USE'],
//     expiresAt: '2025-12-31T23:59:59Z',
//     usageCount: 45,
//     maxUses: 100
//   }
// ]
```

---

## API Usage

### Check Permission

```typescript
const result = await rbac.checkPermission({
  userId: 'user_123',
  resourceType: ResourceType.CREDENTIAL,
  resourceId: 'cred_456',
  action: 'read'
});

if (result.allowed) {
  console.log('Permission granted:', result.reason);
  console.log('Source:', result.source); // 'owner', 'role', 'share', etc.
} else {
  console.log('Permission denied:', result.reason);
}
```

### Grant Resource Permission

```typescript
await rbac.grantResourcePermission(
  'user_123',                      // userId
  ResourceType.WORKFLOW,           // resourceType
  'workflow_456',                  // resourceId
  ['read', 'execute'],             // permissions
  'user_owner',                    // grantedBy
  new Date('2025-12-31')           // expiresAt (optional)
);
```

### Revoke Permission

```typescript
await rbac.revokeResourcePermission(
  'user_123',
  ResourceType.WORKFLOW,
  'workflow_456'
);
```

---

## Middleware

### authorize()

Check permission before route execution:

```typescript
import { authorize } from './backend/middleware/authorization';
import { ResourceType } from '@prisma/client';

router.get('/credentials/:id',
  authenticate,
  authorize(ResourceType.CREDENTIAL, 'read', 'params.id'),
  async (req, res) => {
    // User has READ permission on credential
    const credential = await getCredential(req.params.id);
    res.json(credential);
  }
);

router.post('/credentials/:id/use',
  authenticate,
  authorize(ResourceType.CREDENTIAL, 'use', 'params.id'),
  async (req, res) => {
    // User has USE permission
    const result = await useCredential(req.params.id);
    res.json(result);
  }
);
```

### requireOwnership()

Require resource ownership:

```typescript
import { requireOwnership } from './backend/middleware/authorization';

router.delete('/credentials/:id',
  authenticate,
  requireOwnership(ResourceType.CREDENTIAL, 'params.id'),
  async (req, res) => {
    // Only owner can delete
    await deleteCredential(req.params.id);
    res.json({ success: true });
  }
);
```

### requireRole()

Require specific roles:

```typescript
import { requireRole, requireAdmin } from './backend/middleware/authorization';

// Require admin
router.get('/admin/users',
  authenticate,
  requireAdmin,
  listAllUsers
);

// Require specific roles
router.post('/teams',
  authenticate,
  requireRole(['ADMIN', 'USER']),
  createTeam
);
```

### authorizeCredentialShare()

Check credential-specific permissions:

```typescript
import { authorizeCredentialShare } from './backend/middleware/authorization';

router.post('/credentials/:id/share',
  authenticate,
  authorizeCredentialShare('share'),
  async (req, res) => {
    // User has SHARE permission on credential
    await shareCredential(req.params.id, req.body);
    res.json({ success: true });
  }
);
```

---

## Best Practices

### 1. Principle of Least Privilege

```typescript
// ❌ BAD - Granting ADMIN when only READ needed
await rbac.shareCredential({
  credentialId: 'cred_123',
  sharedWithId: 'user_xyz',
  permissions: [CredentialPermission.ADMIN]  // Too permissive!
});

// ✅ GOOD - Grant only required permissions
await rbac.shareCredential({
  credentialId: 'cred_123',
  sharedWithId: 'user_xyz',
  permissions: [CredentialPermission.READ, CredentialPermission.USE]
});
```

### 2. Use Expiration Dates

```typescript
// Set expiration for temporary access
const oneWeek = new Date();
oneWeek.setDate(oneWeek.getDate() + 7);

await rbac.shareCredential({
  credentialId: 'cred_123',
  sharedWithId: 'contractor_user',
  permissions: [CredentialPermission.USE],
  expiresAt: oneWeek  // Auto-expires in 7 days
});
```

### 3. Limit Usage

```typescript
// For one-time or limited use
await rbac.shareCredential({
  credentialId: 'cred_123',
  sharedWithId: 'partner_user',
  permissions: [CredentialPermission.USE],
  maxUses: 10  // Can only use 10 times
});
```

### 4. Audit Access

```typescript
// Regularly review who has access
const access = await rbac.listCredentialAccess('cred_123', ownerId);

for (const share of access.shares) {
  if (share.usageCount === 0) {
    console.log(`${share.email} has never used this credential`);
  }

  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    console.log(`${share.email} has expired access`);
  }
}
```

### 5. Use Groups for Teams

```typescript
// Instead of sharing with each user individually
// Create a group and share with the group

// Create group
const group = await prisma.userGroup.create({
  data: {
    name: 'Engineering Team',
    permissions: ['CREDENTIAL:use', 'WORKFLOW:execute']
  }
});

// Add members
await prisma.userGroupMember.createMany({
  data: [
    { groupId: group.id, userId: 'user_1' },
    { groupId: group.id, userId: 'user_2' },
    { groupId: group.id, userId: 'user_3' }
  ]
});

// All members automatically get group permissions
```

### 6. Resource-Level Permissions for Exceptions

```typescript
// When you need custom permissions beyond sharing

// Grant a specific user permission to execute a workflow
await rbac.grantResourcePermission(
  'qa_user',
  ResourceType.WORKFLOW,
  'workflow_production_deploy',
  ['read', 'execute'],  // Can view and run, but not edit
  'admin_user',
  new Date('2025-06-30')
);
```

---

## Common Patterns

### Pattern 1: Temporary Contractor Access

```typescript
// Contractor needs to use API key for 30 days
const thirtyDays = new Date();
thirtyDays.setDate(thirtyDays.getDate() + 30);

await rbac.shareCredential({
  credentialId: apiKeyCredentialId,
  ownerId: projectManagerId,
  sharedWithId: contractorId,
  permissions: [CredentialPermission.READ, CredentialPermission.USE],
  expiresAt: thirtyDays,
  maxUses: 1000  // Safety limit
});
```

### Pattern 2: Read-Only Access for Audit

```typescript
// Auditor needs to see credentials but not use them
await rbac.shareCredential({
  credentialId: credentialId,
  ownerId: ownerId,
  sharedWithId: auditorId,
  permissions: [CredentialPermission.READ],  // Read only
  expiresAt: auditEndDate
});
```

### Pattern 3: Team Collaboration

```typescript
// Share with team members for collaboration
const teamMembers = await getTeamMembers(teamId);

for (const member of teamMembers) {
  await rbac.shareCredential({
    credentialId: sharedApiKeyId,
    ownerId: teamOwnerId,
    sharedWithId: member.userId,
    permissions: [
      CredentialPermission.READ,
      CredentialPermission.USE,
      CredentialPermission.EDIT  // Team can update
    ]
  });
}
```

### Pattern 4: Emergency Access Revocation

```typescript
// Immediately revoke all shares for a credential
const access = await rbac.listCredentialAccess(credentialId, ownerId);

for (const share of access.shares) {
  await rbac.revokeCredentialShare(
    credentialId,
    share.userId,
    ownerId
  );
}

console.log(`Revoked access for ${access.shares.length} users`);
```

---

## Database Schema

### CredentialShare

```prisma
model CredentialShare {
  id             String
  credentialId   String
  sharedWithId   String
  sharedById     String
  permissions    CredentialPermission[]
  expiresAt      DateTime?
  isActive       Boolean
  maxUses        Int?
  usageCount     Int
  createdAt      DateTime
  updatedAt      DateTime
}
```

### ResourcePermission

```prisma
model ResourcePermission {
  id            String
  userId        String
  resourceType  ResourceType
  resourceId    String
  permissions   String[]
  grantedBy     String?
  expiresAt     DateTime?
  isActive      Boolean
  createdAt     DateTime
  updatedAt     DateTime
}
```

---

## Troubleshooting

### Issue: Permission Denied Even Though User Should Have Access

**Check:** Permission hierarchy order

```typescript
// Debug permission check
const result = await rbac.checkPermission({
  userId: 'user_123',
  resourceType: ResourceType.CREDENTIAL,
  resourceId: 'cred_456',
  action: 'read'
});

console.log('Allowed:', result.allowed);
console.log('Reason:', result.reason);
console.log('Source:', result.source); // Shows which check granted/denied
```

### Issue: Share Not Working

**Check:**
1. Share is active: `isActive = true`
2. Not expired: `expiresAt > now` or `expiresAt = null`
3. Usage not exceeded: `usageCount < maxUses` or `maxUses = null`

```typescript
// Check share status
const share = await prisma.credentialShare.findFirst({
  where: {
    credentialId: 'cred_123',
    sharedWithId: 'user_456'
  }
});

console.log('Share active:', share?.isActive);
console.log('Expires at:', share?.expiresAt);
console.log('Usage:', `${share?.usageCount}/${share?.maxUses || '∞'}`);
```

---

## Security Considerations

### ✅ What We Protect Against

1. **Unauthorized Access** - Users can only access what they're explicitly allowed
2. **Privilege Escalation** - Users cannot grant themselves higher permissions
3. **Expired Access** - Automatic expiration of shares and permissions
4. **Over-usage** - Usage limits prevent abuse
5. **Audit Trail** - All access attempts logged

### ⚠️ Best Security Practices

```typescript
// 1. Always verify ownership before sharing
const credential = await prisma.credential.findUnique({
  where: { id: credentialId },
  select: { userId: true }
});

if (credential.userId !== currentUserId) {
  throw new Error('Not authorized to share this credential');
}

// 2. Set reasonable expiration dates
const maxExpiration = new Date();
maxExpiration.setFullYear(maxExpiration.getFullYear() + 1); // Max 1 year

// 3. Limit permissions to minimum required
// Don't give ADMIN when USE is sufficient

// 4. Regularly audit access
// Run monthly reports on shares and revoke unused ones

// 5. Use groups for team access
// Easier to manage and audit than individual shares
```

---

## Support

For RBAC questions or issues:

- 📧 **Support:** support@workflow-platform.com
- 📚 **Documentation:** https://docs.workflow-platform.com/rbac

---

**Last Updated:** January 2025
**Version:** 2.0.0
**Status:** ✅ Production Ready
