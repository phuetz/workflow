# Advanced Security Features - Workflow Automation Platform

This module provides enterprise-grade security features including authentication, authorization, encryption, threat detection, vulnerability scanning, secure communication, and data loss prevention.

## 🔐 Security Components

### Authentication Service
- **Multi-Factor Authentication**: TOTP-based 2FA with backup codes
- **JWT Tokens**: Secure access and refresh token management
- **Session Management**: Concurrent session limits and sliding expiration
- **Password Policies**: Configurable complexity requirements and history
- **Account Security**: Failed attempt tracking and account lockout
- **Security Events**: Comprehensive audit trail of authentication events

### Authorization Service
- **RBAC**: Role-based access control with inheritance
- **ABAC**: Attribute-based access control with conditions
- **Policy Engine**: Flexible policy rules with priorities
- **Permission Management**: Granular permission system
- **Resource Groups**: Logical grouping of resources for access control
- **Bulk Operations**: Efficient batch authorization checks

### Encryption Service
- **Advanced Algorithms**: AES-256-GCM, ChaCha20-Poly1305 support
- **Key Management**: Automatic key rotation and secure storage
- **Key Derivation**: PBKDF2, scrypt, and Argon2 support
- **Digital Signatures**: RSA and ECDSA signature generation/verification
- **Compression**: Optional compression before encryption
- **Secure Storage**: Encrypted data storage with integrity checks

### Threat Detection Service
- **Real-time Analysis**: Continuous threat monitoring and detection
- **ML-based Detection**: Anomaly detection using behavioral patterns
- **Security Rules**: Configurable threat detection rules
- **Threat Intelligence**: Integration with threat intelligence feeds
- **Automated Response**: Configurable mitigation actions
- **User Behavior Analytics**: Profile-based anomaly detection

### Security Scanning Service
- **Multi-scan Types**: Dependency, code, container, web, API, network scanning
- **Vulnerability Database**: Known vulnerability detection
- **Custom Rules**: Configurable security scanning rules
- **Compliance Scanning**: OWASP, GDPR, PCI DSS compliance checks
- **Report Generation**: Detailed vulnerability reports with remediation
- **Continuous Scanning**: Automated scheduled security scans

### Secure Communication Service
- **TLS/mTLS**: Advanced TLS configuration with client certificates
- **Secure WebSocket**: Encrypted WebSocket communication
- **Message Encryption**: End-to-end encrypted messaging
- **Certificate Management**: X.509 certificate lifecycle management
- **Perfect Forward Secrecy**: Ephemeral key exchange support
- **Security Audit**: Configuration security assessments

### Data Loss Prevention (DLP)
- **Content Analysis**: Intelligent data classification and detection
- **Policy Engine**: Flexible DLP policies with multiple actions
- **Data Types**: PII, credit cards, SSN, API keys, and custom patterns
- **Action Types**: Block, quarantine, encrypt, redact, alert, log
- **Approval Workflows**: Multi-step approval processes
- **Incident Management**: Complete incident tracking and resolution

## 🚀 Quick Start

### Installation

```bash
cd security
npm install

# Core dependencies
npm install jsonwebtoken bcrypt speakeasy qrcode
npm install ws @types/ws
npm install @types/node crypto
```

### Basic Usage

```typescript
import {
  AuthenticationService,
  AuthorizationService,
  EncryptionService,
  ThreatDetectionService,
  SecurityScanningService,
  SecureCommunicationService,
  DataLossPreventionService
} from '@workflow/security';

// Initialize authentication
const authConfig = {
  jwtSecret: 'your-jwt-secret',
  jwtRefreshSecret: 'your-refresh-secret',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  bcryptRounds: 12,
  maxFailedAttempts: 5,
  lockoutDuration: 300000,
  twoFactorIssuer: 'Workflow Platform',
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5
  },
  sessionConfig: {
    maxConcurrentSessions: 3,
    sessionTimeout: 1800000,
    slidingExpiration: true
  }
};

const authService = new AuthenticationService(authConfig);
const authzService = new AuthorizationService();
const encryptionService = new EncryptionService({
  defaultAlgorithm: 'aes-256-gcm',
  keyDerivation: {
    algorithm: 'pbkdf2',
    iterations: 100000,
    saltLength: 32
  },
  keyRotation: {
    enabled: true,
    intervalDays: 30,
    keepOldKeys: 5
  },
  compression: {
    enabled: true,
    algorithm: 'gzip'
  }
});
```

## 🔐 Authentication & Authorization

### User Registration and Login

```typescript
// Create user
const user = await authService.createUser({
  email: 'user@example.com',
  username: 'johndoe',
  password: 'SecurePassword123!',
  roles: ['user'],
  metadata: { department: 'engineering' }
});

// Login with 2FA
const tokens = await authService.login(
  {
    email: 'user@example.com',
    password: 'SecurePassword123!',
    twoFactorCode: '123456'
  },
  {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    deviceId: 'device-123'
  }
);

// Verify token
const payload = await authService.verifyToken(tokens.accessToken);
```

### Role-Based Access Control

```typescript
// Create role
const role = await authzService.createRole({
  name: 'Workflow Manager',
  description: 'Manage workflows and users',
  permissions: [
    'workflow:create',
    'workflow:read',
    'workflow:update',
    'workflow:delete',
    'user:read'
  ],
  inheritsFrom: ['user']
});

// Assign role to user
await authzService.assignRolesToUser('user-id', ['workflow-manager']);

// Check access
const decision = await authzService.checkAccess({
  userId: 'user-id',
  roles: ['workflow-manager'],
  permissions: authzService.getUserPermissions('user-id'),
  attributes: {},
  resource: 'workflow',
  action: 'create',
  environment: {
    timestamp: new Date(),
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
  }
});

console.log('Access allowed:', decision.allowed);
```

### Policy-Based Authorization

```typescript
// Create policy
const policy = await authzService.createPolicy({
  name: 'Admin Hours Access',
  description: 'Allow admin access only during business hours',
  effect: 'ALLOW',
  subjects: ['admin'],
  resources: ['system'],
  actions: ['*'],
  conditions: [
    {
      attribute: 'environment.timestamp',
      operator: 'gt',
      value: '09:00'
    },
    {
      attribute: 'environment.timestamp',
      operator: 'lt',
      value: '17:00'
    }
  ],
  priority: 100
});
```

## 🛡️ Encryption & Data Protection

### Content Encryption

```typescript
// Encrypt data
const encrypted = await encryptionService.encrypt('sensitive data');
console.log('Encrypted:', encrypted.data);

// Decrypt data
const decrypted = await encryptionService.decrypt(encrypted);
console.log('Decrypted:', decrypted.toString());

// Secure storage
const storageId = await encryptionService.encryptAndStore({
  creditCard: '4111-1111-1111-1111',
  user: 'john@example.com'
});

const retrieved = await encryptionService.retrieveAndDecrypt(storageId);
```

### Digital Signatures

```typescript
// Generate key pair
const keyPair = encryptionService.generateKeyPair('rsa', 2048);

// Sign data
const signature = encryptionService.sign('important document', keyPair.privateKey);

// Verify signature
const isValid = encryptionService.verify('important document', signature);
console.log('Signature valid:', isValid);
```

### Password Security

```typescript
// Hash password
const hashedPassword = await encryptionService.hashPassword('userPassword123');

// Verify password
const isValid = await encryptionService.verifyPassword('userPassword123', hashedPassword);
```

## 🕵️ Threat Detection & Monitoring

### Real-time Threat Detection

```typescript
const threatService = new ThreatDetectionService();

// Analyze event for threats
const threat = await threatService.analyzeEvent({
  type: 'login_attempt',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  userId: 'user-123',
  success: false,
  timestamp: new Date()
});

if (threat) {
  console.log('Threat detected:', threat.type, threat.score);
}

// Listen for threats
threatService.on('threatDetected', (threat) => {
  console.log(`Security threat: ${threat.type} (Score: ${threat.score})`);
});

// Check if IP is blocked
if (threatService.isIPBlocked('192.168.1.100')) {
  console.log('IP address is blocked');
}
```

### Custom Security Rules

```typescript
// Create custom rule
const rule = threatService.createSecurityRule({
  name: 'Suspicious API Usage',
  description: 'Detect excessive API calls from single IP',
  type: 'dos',
  enabled: true,
  conditions: [
    {
      field: 'request.endpoint',
      operator: 'contains',
      value: '/api/',
      weight: 0.5
    },
    {
      field: 'source.ipAddress',
      operator: 'count_gt',
      value: 100,
      weight: 0.8
    }
  ],
  actions: [
    {
      type: 'rate_limit',
      config: { limit: 10, window: 60 },
      enabled: true
    }
  ],
  severity: 'high',
  threshold: 0.7,
  timeWindow: 300,
  cooldown: 1800
});
```

## 🔍 Security Scanning

### Vulnerability Scanning

```typescript
const scanService = new SecurityScanningService();

// Scan dependencies
const scanId = await scanService.startScan({
  type: 'dependency',
  target: '/path/to/project',
  options: {
    recursive: true,
    severityThreshold: 'medium'
  }
});

// Monitor scan progress
scanService.on('scanCompleted', (result) => {
  console.log(`Scan completed: ${result.vulnerabilities} vulnerabilities found`);
});

// Get scan report
const report = scanService.getScanReport(scanId);
if (report) {
  console.log('Vulnerabilities:', report.summary);
  
  for (const vuln of report.vulnerabilities) {
    console.log(`${vuln.severity}: ${vuln.title}`);
    console.log(`Remediation: ${vuln.remediation.description}`);
  }
}
```

### Code Security Scanning

```typescript
// Scan source code
const codeScanId = await scanService.startScan({
  type: 'code',
  target: './src',
  options: {
    includePatterns: ['*.ts', '*.js'],
    excludePatterns: ['*.test.ts', 'node_modules'],
    recursive: true
  }
});
```

### Custom Scan Rules

```typescript
// Create custom rule
const customRule = scanService.createScanRule({
  name: 'Hardcoded Database Credentials',
  description: 'Detect hardcoded database connection strings',
  category: 'sensitive_data',
  severity: 'critical',
  pattern: /mongodb:\/\/[^:]+:[^@]+@/gi,
  fileTypes: ['.js', '.ts', '.json'],
  enabled: true,
  customRule: true,
  metadata: { type: 'credential' }
});
```

## 🔐 Secure Communication

### TLS/mTLS Setup

```typescript
const commService = new SecureCommunicationService();

// Create secure channel
const channelId = await commService.createSecureChannel({
  name: 'API Communication',
  type: 'mtls',
  encryption: {
    algorithm: 'TLS-1.3',
    keyExchange: 'ECDH',
    cipherSuites: ['TLS_AES_256_GCM_SHA384'],
    certificateValidation: true,
    perfectForwardSecrecy: true
  },
  authentication: {
    type: 'certificate',
    certificates: [certificate],
    clientCertRequired: true
  },
  endpoints: ['api.example.com:443']
});

// Establish TLS connection
const connectionId = await commService.establishTLSConnection(
  channelId,
  'api.example.com:443'
);
```

### Secure WebSocket

```typescript
// Create secure WebSocket channel
const wsChannelId = await commService.createSecureChannel({
  name: 'Real-time Updates',
  type: 'websocket_tls',
  encryption: {
    algorithm: 'TLS-1.3',
    keyExchange: 'ECDH',
    cipherSuites: [],
    certificateValidation: true,
    perfectForwardSecrecy: true
  },
  authentication: {
    type: 'certificate',
    certificates: [certificate]
  },
  endpoints: ['localhost:8443']
});

// Listen for secure messages
commService.on('secureMessage', (data) => {
  console.log('Secure message received:', data.message);
});
```

### Encrypted Messaging

```typescript
// Send encrypted message
const messageId = await commService.sendEncryptedMessage(
  channelId,
  ['recipient1', 'recipient2'],
  'This is a confidential message',
  { priority: 'high' }
);

// Receive encrypted message
const decryptedMessage = await commService.receiveEncryptedMessage(messageId);
console.log('Decrypted message:', decryptedMessage);
```

## 🛡️ Data Loss Prevention

### DLP Policy Configuration

```typescript
const dlpService = new DataLossPreventionService();

// Create DLP policy
const policy = dlpService.createPolicy({
  name: 'Prevent Credit Card Leakage',
  description: 'Block transmission of credit card numbers',
  enabled: true,
  priority: 1,
  dataTypes: ['credit_card'],
  conditions: [
    {
      type: 'content',
      operator: 'contains',
      value: 'credit_card',
      caseSensitive: false,
      weight: 1.0
    }
  ],
  actions: [
    {
      type: 'block',
      config: { message: 'Credit card data blocked' },
      enabled: true
    },
    {
      type: 'alert',
      config: { 
        channels: ['email', 'slack'],
        severity: 'critical'
      },
      enabled: true
    }
  ],
  scope: {
    channels: ['email', 'api', 'web'],
    users: [],
    departments: [],
    applications: [],
    locations: [],
    timeZones: []
  },
  exceptions: ['compliance@company.com']
});
```

### Content Analysis

```typescript
// Analyze content for sensitive data
const analysis = await dlpService.analyzeContent(
  'Customer data: John Doe, SSN: 123-45-6789, CC: 4111-1111-1111-1111',
  {
    userId: 'user-123',
    userEmail: 'user@company.com',
    department: 'sales',
    application: 'crm',
    channel: 'email',
    action: 'send',
    destination: 'external@customer.com'
  }
);

console.log('Risk score:', analysis.riskScore);
console.log('Data matches:', analysis.dataMatches.length);
console.log('Policy violations:', analysis.violations.length);
console.log('Actions taken:', analysis.actionsTaken.map(a => a.type));
```

### Incident Management

```typescript
// Get DLP incidents
const incidents = dlpService.getAllIncidents({
  severity: 'high',
  status: 'open',
  limit: 10
});

// Update incident status
const incident = dlpService.updateIncidentStatus(
  'incident-id',
  'resolved',
  'False positive - authorized data transfer'
);

// Approve quarantined content
const approval = dlpService.approveRequest(
  'request-id',
  'admin@company.com',
  'Approved for compliance reporting'
);
```

## 📊 Security Monitoring & Analytics

### Security Dashboard

```typescript
// Get security statistics
const authStats = authService.getStats();
const threatStats = threatService.getStats();
const scanStats = scanService.getStats();
const dlpStats = dlpService.getStats();
const commStats = commService.getStats();

console.log('Security Overview:');
console.log('- Active users:', authStats.activeUsers);
console.log('- Failed logins today:', authStats.failedLoginsToday);
console.log('- Threats detected:', threatStats.totalThreats);
console.log('- Vulnerabilities found:', scanStats.totalVulnerabilities);
console.log('- DLP incidents:', dlpStats.totalIncidents);
console.log('- Secure channels:', commStats.totalChannels);
```

### Compliance Reporting

```typescript
// Generate compliance report
const complianceReport = scanService.generateComplianceReport([
  'GDPR', 'PCI DSS', 'SOX', 'HIPAA'
]);

for (const standard of complianceReport) {
  console.log(`${standard.standard}: ${standard.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
  console.log(`Score: ${standard.score}/100`);
  console.log(`Issues: ${standard.issues.length}`);
}
```

### Security Audit

```typescript
// Perform security audit
const audit = commService.performSecurityAudit();

console.log('Weak configurations:', audit.weakConfigurations);
console.log('Expired certificates:', audit.expiredCertificates);
console.log('Insecure connections:', audit.insecureConnections);
console.log('Recommendations:', audit.recommendations);
```

## 🔧 Configuration Management

### Environment Configuration

```typescript
const securityConfig = {
  authentication: {
    jwtSecret: process.env.JWT_SECRET,
    tokenExpiry: process.env.TOKEN_EXPIRY || '15m',
    maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 300000
  },
  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    keyRotationDays: parseInt(process.env.KEY_ROTATION_DAYS) || 30
  },
  threatDetection: {
    enabled: process.env.THREAT_DETECTION_ENABLED === 'true',
    sensitivity: process.env.THREAT_SENSITIVITY || 'medium'
  },
  dlp: {
    enabled: process.env.DLP_ENABLED === 'true',
    quarantineDuration: parseInt(process.env.QUARANTINE_DURATION) || 86400000
  }
};
```

### Security Headers

```typescript
// Apply security headers to HTTP responses
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

## 🚨 Event Handling

### Security Event Listeners

```typescript
// Authentication events
authService.on('userLogin', (event) => {
  console.log(`User ${event.userId} logged in from ${event.ipAddress}`);
});

authService.on('accountLocked', (event) => {
  console.log(`Account ${event.userId} locked after ${event.failedAttempts} attempts`);
});

// Threat detection events
threatService.on('threatDetected', (threat) => {
  if (threat.severity === 'critical') {
    // Immediate notification
    notifySecurityTeam(threat);
  }
});

// DLP events
dlpService.on('policyViolation', (incident) => {
  logSecurityIncident(incident);
  
  if (incident.severity === 'critical') {
    escalateToCompliance(incident);
  }
});

// Scanning events
scanService.on('scanCompleted', (result) => {
  if (result.summary.critical > 0) {
    createSecurityTicket(result);
  }
});
```

## 📚 Best Practices

### Security Configuration

1. **Strong Authentication**: Always enable 2FA and enforce strong password policies
2. **Principle of Least Privilege**: Grant minimum required permissions
3. **Regular Rotation**: Rotate encryption keys and certificates regularly
4. **Monitoring**: Enable comprehensive security monitoring and alerting
5. **Compliance**: Regularly audit against compliance requirements
6. **Incident Response**: Have clear procedures for security incident handling

### Development Guidelines

1. **Secure by Default**: Use secure configurations as defaults
2. **Input Validation**: Validate all user inputs and API parameters
3. **Error Handling**: Don't expose sensitive information in errors
4. **Logging**: Log security events but not sensitive data
5. **Testing**: Include security tests in your test suite
6. **Updates**: Keep security dependencies up to date

## 🤝 Integration Examples

### Workflow Engine Integration

```typescript
// Integrate security services with workflow engine
const workflowEngine = new WorkflowEngine({
  authService,
  authzService,
  encryptionService,
  threatService,
  dlpService
});

// Secure node execution
workflowEngine.on('nodeExecute', async (nodeExecution) => {
  // Check authorization
  const authorized = await authzService.checkAccess({
    userId: nodeExecution.userId,
    resource: 'workflow-node',
    action: 'execute',
    // ... other context
  });
  
  if (!authorized.allowed) {
    throw new Error('Unauthorized node execution');
  }
  
  // Analyze content for DLP
  if (nodeExecution.nodeType === 'send-email') {
    const analysis = await dlpService.analyzeContent(
      nodeExecution.inputs.content,
      nodeExecution.context
    );
    
    if (analysis.violations.length > 0) {
      throw new Error('DLP policy violation detected');
    }
  }
});
```

## 📄 License

This security module is part of the Workflow Automation Platform and follows the same licensing terms.