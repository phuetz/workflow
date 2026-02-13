# OAuth Route Fixes - Key Changes

## Before → After

### 1. Added OAuth2Request Interface

**BEFORE:**
```typescript
import express, { Request, Response, NextFunction } from 'express';
import { oauth2Service } from '../../auth/OAuth2Service';
import { encryptionService } from '../../security/EncryptionService';
import { logger } from '../../../services/LoggingService';

const router = express.Router();
```

**AFTER:**
```typescript
import express, { Request, Response, NextFunction } from 'express';
import { oauth2Service } from '../../auth/OAuth2Service';
import { encryptionService } from '../../security/EncryptionService';
import { logger } from '../../../services/LoggingService';

// Extend Request to include session
interface OAuth2Request extends Request {
  session?: {
    pkceVerifier?: string;
    oauthState?: string;
    oauthProvider?: string;
    oauth2Credentials?: {
      [provider: string]: {
        encrypted: any;
        userInfo?: any;
        connectedAt?: string;
        lastRefreshed?: string;
      };
    };
  };
}

const router = express.Router();
```

---

### 2. Updated Route Handler Type

**BEFORE:**
```typescript
router.get('/:provider/authorize', async (req: Request, res: Response, next: NextFunction) => {
  // ❌ Error: Property 'session' does not exist on type 'Request'
  if (codeVerifier && req.session) {
    req.session.pkceVerifier = codeVerifier;
  }
});
```

**AFTER:**
```typescript
router.get('/:provider/authorize', async (req: OAuth2Request, res: Response, next: NextFunction) => {
  // ✅ No error: session is now typed
  if (codeVerifier && req.session) {
    req.session.pkceVerifier = codeVerifier;
  }
});
```

---

### 3. Fixed Undefined expiresAt

**BEFORE:**
```typescript
const tokens = await encryptionService.decryptOAuth2Tokens(credential.encrypted);

// ❌ Error: 'tokens.expiresAt' is possibly 'undefined'
const needsRefresh = oauth2Service.needsRefresh(tokens.expiresAt);
const isExpired = Date.now() >= tokens.expiresAt;

res.json({
  expiresIn: Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000)),
  // ...
});
```

**AFTER:**
```typescript
const tokens = await encryptionService.decryptOAuth2Tokens(credential.encrypted);

// ✅ Handle undefined case
const expiresAt = tokens.expiresAt || 0;
const needsRefresh = tokens.expiresAt ? oauth2Service.needsRefresh(tokens.expiresAt) : true;
const isExpired = Date.now() >= expiresAt;

res.json({
  expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
  // ...
});
```

---

## Error Reduction

| Category | Before | After |
|----------|--------|-------|
| Session errors | 22 | 0 |
| expiresAt errors | 7 | 0 |
| **Total** | **29** | **0** |

## Routes Updated

All 6 route handlers now use `OAuth2Request`:
1. ✅ `GET /:provider/authorize`
2. ✅ `GET /:provider/callback`
3. ✅ `POST /:provider/refresh`
4. ✅ `DELETE /:provider/revoke`
5. ✅ `GET /:provider/status`
6. ✅ `POST /:provider/test`

Plus 1 route that didn't need session:
7. ✅ `GET /providers` (unchanged, no session needed)
