# Enterprise Features Extended

This module provides comprehensive enterprise-grade features for large-scale workflow automation deployments, including Single Sign-On (SSO), audit compliance, multi-tenancy, custom reporting, and SLA management.

## Components

### 1. Single Sign-On (SSO) Provider (`sso/SSOProvider.ts`)
Complete SSO implementation supporting multiple authentication protocols:

#### Supported Protocols
- **SAML 2.0**: Enterprise SAML authentication with metadata-based configuration
- **OAuth 2.0**: OAuth 2.0 with PKCE support and configurable scopes
- **OpenID Connect (OIDC)**: Full OIDC implementation with ID token validation
- **LDAP/Active Directory**: Directory service authentication with group mapping
- **Kerberos**: Windows Kerberos authentication support
- **Custom**: Extensible custom authentication providers

#### Features
- User attribute mapping and transformation
- Session management with configurable timeouts
- Multi-factor authentication (MFA) integration
- Domain-based tenant routing
- Automatic user provisioning
- Session refresh and token management

```typescript
const ssoProvider = new SSOProvider({
  provider: 'saml',
  providerConfig: {
    entityId: 'your-entity-id',
    callbackUrl: 'https://app.example.com/sso/callback',
    idpMetadata: 'path/to/metadata.xml',
    privateKey: 'your-private-key',
    certificate: 'your-certificate'
  },
  userMapping: {
    id: 'NameID',
    email: 'email',
    name: 'displayName',
    groups: 'memberOf'
  },
  mfaRequired: true
});

// Generate SAML authentication request
const { url, id } = await ssoProvider.generateSAMLRequest();

// Process SAML response
const session = await ssoProvider.processSAMLResponse(response, id);
```

### 2. Audit Compliance (`compliance/AuditCompliance.ts`)
Comprehensive audit logging and compliance management system:

#### Compliance Frameworks
- **SOC 2**: System and Organization Controls compliance
- **HIPAA**: Health Insurance Portability and Accountability Act
- **GDPR**: General Data Protection Regulation
- **PCI-DSS**: Payment Card Industry Data Security Standard
- **ISO 27001**: Information Security Management
- **NIST**: National Institute of Standards and Technology Framework

#### Features
- Automated compliance checking and reporting
- Immutable audit logs with cryptographic integrity
- PII detection and data classification
- Legal hold management
- Real-time compliance monitoring
- Automated evidence collection

```typescript
const auditCompliance = new AuditCompliance({
  frameworks: [
    {
      name: 'SOC2',
      requirements: [...],
      controls: [...]
    }
  ],
  retentionPolicy: {
    defaultRetentionDays: 2555, // 7 years
    policies: [
      {
        eventType: 'user.login',
        retentionDays: 90,
        deleteAfterRetention: true
      }
    ]
  },
  encryptionEnabled: true,
  realTimeAlerts: true
});

// Log audit event
await auditCompliance.logEvent({
  eventType: 'workflow.execution',
  actor: {
    id: 'user123',
    type: 'user',
    name: 'John Doe',
    ip: '192.168.1.100'
  },
  action: 'execute_workflow',
  resource: {
    type: 'workflow',
    id: 'workflow456',
    name: 'Data Processing'
  },
  outcome: 'success'
});

// Run compliance check
const reports = await auditCompliance.runComplianceCheck('SOC2');
```

### 3. Multi-Tenancy Manager (`multitenancy/MultiTenancyManager.ts`)
Complete multi-tenant architecture with data isolation:

#### Isolation Levels
- **Shared**: Shared infrastructure with logical data separation
- **Dedicated**: Dedicated resources per tenant
- **Hybrid**: Mixed isolation based on tenant requirements

#### Features
- Automatic tenant provisioning and resource allocation
- Resource limits and quota management
- Tenant hierarchies and sub-tenants
- Data residency compliance
- Custom branding and white-labeling
- Billing integration and usage tracking

```typescript
const multiTenancy = new MultiTenancyManager();

// Create new tenant
const tenant = await multiTenancy.createTenant({
  name: 'Acme Corporation',
  slug: 'acme-corp',
  status: 'active',
  tier: 'enterprise',
  config: {
    isolationLevel: 'dedicated',
    dataResidency: {
      region: 'us-east-1',
      complianceRequirements: ['SOC2', 'HIPAA']
    },
    resourceLimits: {
      users: 1000,
      workflows: 500,
      executions: { perMonth: 100000 },
      storage: { total: 100 }
    },
    customization: {
      branding: {
        logo: 'https://acme.com/logo.png',
        primaryColor: '#007bff'
      }
    }
  },
  admins: ['admin@acme.com'],
  createdBy: 'system'
});

// Set tenant context
multiTenancy.setTenantContext(tenant.id);

// Execute operation in tenant context
await multiTenancy.withTenantContext(tenant.id, async () => {
  // All operations here are isolated to this tenant
  await createWorkflow({ name: 'Tenant Workflow' });
});
```

### 4. Custom Reporting Engine (`reporting/CustomReportingEngine.ts`)
Advanced reporting system with multiple data sources and visualizations:

#### Data Sources
- **Database**: SQL and NoSQL database connections
- **API**: REST and GraphQL API integration
- **Files**: CSV, JSON, Excel file processing
- **Workflow Data**: Direct access to workflow execution data
- **Custom**: Extensible custom data source connectors

#### Visualization Types
- Line, Bar, Pie, Area, Scatter plots
- Heatmaps, Gauges, Metrics cards
- Interactive tables with sorting/filtering
- Geographic maps with data overlay
- Custom chart types with D3.js integration

#### Features
- Real-time and scheduled report generation
- Multiple output formats (PDF, Excel, CSV, HTML)
- Advanced filtering and aggregation
- Parameter-driven reports
- Automated distribution via email, Slack, webhooks
- Report templates and marketplace

```typescript
const reportingEngine = new CustomReportingEngine();

// Create custom report
const report = await reportingEngine.createReport({
  name: 'Workflow Performance Report',
  type: 'operational',
  dataSource: {
    type: 'database',
    connection: {
      host: 'localhost',
      database: 'workflows',
      username: 'report_user'
    }
  },
  query: {
    type: 'sql',
    query: `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as executions,
        AVG(duration) as avg_duration,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failures
      FROM workflow_executions 
      WHERE created_at BETWEEN :start_date AND :end_date
      GROUP BY DATE(created_at)
      ORDER BY date
    `
  },
  visualization: {
    charts: [
      {
        id: 'execution-trend',
        type: 'line',
        title: 'Daily Executions',
        dataMapping: {
          x: 'date',
          y: 'executions'
        }
      },
      {
        id: 'performance-metrics',
        type: 'bar',
        title: 'Average Duration',
        dataMapping: {
          x: 'date',
          y: 'avg_duration'
        }
      }
    ],
    layout: { type: 'grid', columns: 2 }
  },
  parameters: [
    {
      name: 'start_date',
      type: 'date',
      required: true,
      defaultValue: new Date('2024-01-01')
    },
    {
      name: 'end_date',
      type: 'date',
      required: true,
      defaultValue: new Date()
    }
  ],
  schedule: {
    enabled: true,
    frequency: 'daily',
    timezone: 'UTC'
  },
  distribution: {
    enabled: true,
    recipients: [
      { type: 'email', email: 'reports@company.com' }
    ],
    channels: [
      { type: 'email', format: 'pdf' }
    ]
  },
  format: ['pdf', 'excel', 'csv']
});

// Execute report
const execution = await reportingEngine.executeReport(report.id, {
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-31')
});
```

### 5. SLA Management (`sla/SLAManagement.ts`)
Comprehensive Service Level Agreement monitoring and management:

#### SLA Types
- **Availability**: System uptime and availability monitoring
- **Performance**: Response time and throughput tracking
- **Resolution Time**: Issue resolution and escalation management
- **Custom**: Flexible custom SLA definitions

#### Features
- Real-time SLA monitoring and alerting
- Automated breach detection and escalation
- Business hours and exclusion management
- Penalty calculation and tracking
- Comprehensive SLA reporting and dashboards
- Trend analysis and forecasting

```typescript
const slaManager = new SLAManagement();

// Create SLA definition
const sla = await slaManager.createSLA({
  name: 'API Availability SLA',
  type: 'availability',
  target: {
    metric: 'uptime',
    value: 99.9,
    unit: 'percentage',
    aggregation: 'average',
    comparison: 'greater-than',
    thresholds: {
      warning: 99.5,
      critical: 99.0
    }
  },
  measurement: {
    source: 'metrics',
    query: 'avg(up{service="api"})',
    interval: 'minute'
  },
  businessHours: {
    timezone: 'UTC',
    schedule: [
      { day: 'monday', start: '09:00', end: '17:00' },
      { day: 'tuesday', start: '09:00', end: '17:00' },
      // ... other days
    ]
  },
  escalation: {
    enabled: true,
    levels: [
      {
        level: 1,
        threshold: 95,
        delay: 5,
        contacts: [
          {
            type: 'email',
            target: 'oncall@company.com'
          }
        ]
      },
      {
        level: 2,
        threshold: 90,
        delay: 15,
        contacts: [
          {
            type: 'pagerduty',
            target: 'escalation-key'
          }
        ]
      }
    ]
  },
  penalties: [
    {
      type: 'credit',
      trigger: {
        breachPercentage: 1
      },
      calculation: {
        type: 'percentage',
        value: 10 // 10% credit
      }
    }
  ],
  reporting: {
    frequency: 'daily',
    recipients: ['sla-reports@company.com'],
    format: 'dashboard',
    includeDetails: true
  },
  status: 'active',
  validity: {
    startDate: new Date(),
    endDate: new Date('2024-12-31')
  }
});

// Get SLA dashboard
const dashboard = slaManager.getSLADashboard();

// Generate SLA report
const report = await slaManager.generateSLAReport(sla.id, {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
});
```

## Installation and Setup

### Prerequisites
- Node.js 16+ with TypeScript support
- Database (PostgreSQL recommended)
- Redis for caching and session storage
- Email service for notifications

### Configuration

```typescript
// Enterprise module configuration
const enterpriseConfig = {
  sso: {
    enabled: true,
    providers: ['saml', 'oidc', 'ldap'],
    sessionTimeout: 3600,
    mfaRequired: true
  },
  multiTenancy: {
    enabled: true,
    defaultIsolation: 'shared',
    autoProvisioning: true
  },
  compliance: {
    frameworks: ['SOC2', 'GDPR'],
    encryptionAtRest: true,
    auditRetention: 2555 // days
  },
  reporting: {
    enabled: true,
    maxConcurrentReports: 10,
    cacheResults: true
  },
  sla: {
    enabled: true,
    defaultMonitoringInterval: 'minute',
    alertChannels: ['email', 'slack']
  }
};
```

### Database Schema
The enterprise module requires additional database tables:

```sql
-- SSO Sessions
CREATE TABLE sso_sessions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  event_type VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  details JSONB,
  integrity_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  definition JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLAs
CREATE TABLE slas (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  definition JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA Measurements
CREATE TABLE sla_measurements (
  id UUID PRIMARY KEY,
  sla_id UUID REFERENCES slas(id),
  timestamp TIMESTAMP NOT NULL,
  value NUMERIC NOT NULL,
  target NUMERIC NOT NULL,
  achievement NUMERIC NOT NULL,
  status VARCHAR(20) NOT NULL,
  INDEX idx_sla_timestamp (sla_id, timestamp)
);
```

## Integration Examples

### With Express.js Application

```typescript
import express from 'express';
import { SSOProvider, MultiTenancyManager } from '@workflow/enterprise';

const app = express();
const ssoProvider = new SSOProvider(ssoConfig);
const multiTenancy = new MultiTenancyManager();

// SSO middleware
app.use('/api', async (req, res, next) => {
  const sessionId = req.cookies.sso_session;
  if (sessionId) {
    const user = await ssoProvider.validateSession(sessionId);
    if (user) {
      req.user = user;
      
      // Set tenant context if available
      const tenant = multiTenancy.getTenantByDomain(req.hostname);
      if (tenant) {
        multiTenancy.setTenantContext(tenant.id);
      }
      
      return next();
    }
  }
  
  res.status(401).json({ error: 'Authentication required' });
});

// SSO routes
app.get('/sso/login', async (req, res) => {
  const { url } = await ssoProvider.generateSAMLRequest();
  res.redirect(url);
});

app.post('/sso/callback', async (req, res) => {
  try {
    const session = await ssoProvider.processSAMLResponse(req.body.SAMLResponse);
    res.cookie('sso_session', session.id, {
      httpOnly: true,
      secure: true,
      maxAge: 3600000
    });
    res.redirect('/dashboard');
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### With Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-enterprise
spec:
  replicas: 3
  selector:
    matchLabels:
      app: workflow-enterprise
  template:
    metadata:
      labels:
        app: workflow-enterprise
    spec:
      containers:
      - name: workflow-enterprise
        image: workflow/enterprise:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: workflow-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: workflow-secrets
              key: redis-url
        - name: SSO_ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: workflow-secrets
              key: sso-encryption-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Security Considerations

### Data Protection
- All sensitive data encrypted at rest using AES-256
- Encryption keys managed via key rotation policies
- PII automatically detected and classified
- GDPR right-to-be-forgotten implementation

### Access Control
- Role-based access control (RBAC) with fine-grained permissions
- Multi-factor authentication enforcement
- Session timeout and concurrent session limits
- IP-based access restrictions

### Audit & Compliance
- Immutable audit logs with cryptographic integrity
- Comprehensive compliance reporting
- Automated compliance checking
- Legal hold management for litigation

## Performance & Scalability

### Caching Strategy
- Multi-tier caching (L1: Memory, L2: Redis, L3: Database)
- Intelligent cache invalidation
- Report result caching with TTL
- Session data optimization

### Database Optimization
- Partitioned tables for large audit logs
- Optimized indexes for common queries
- Connection pooling and read replicas
- Automated archiving of old data

### Monitoring & Alerting
- Real-time SLA monitoring
- Performance metrics collection
- Automated alerting and escalation
- Health check endpoints

## Troubleshooting

### Common Issues

1. **SSO Authentication Failures**
   - Check SAML metadata configuration
   - Verify certificate validity
   - Ensure clock synchronization

2. **Multi-tenancy Context Issues**
   - Verify tenant context is set correctly
   - Check database schema isolation
   - Validate resource limits

3. **Report Generation Failures**
   - Check data source connectivity
   - Verify SQL query syntax
   - Monitor report execution timeouts

4. **SLA Monitoring Issues**
   - Validate measurement source configuration
   - Check escalation policy setup
   - Verify alert channel connectivity

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and contribution guidelines.

## License

Enterprise features are available under a commercial license. Contact sales for pricing and licensing information.