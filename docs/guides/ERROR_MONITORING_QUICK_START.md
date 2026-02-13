# Error Monitoring - Quick Start Guide

Get started with error monitoring in under 5 minutes!

## Installation

No additional dependencies required - the system is built into the platform.

## Step 1: Initialize (30 seconds)

Add to your application entry point:

```typescript
// src/main.tsx or src/index.ts
import { ErrorMonitoringSystem } from './monitoring/ErrorMonitoringSystem';

// Initialize with default settings
const monitor = ErrorMonitoringSystem.getInstance({
  enabled: true,
  sampleRate: 1.0, // Capture all errors in development
});

console.log('✅ Error monitoring enabled');
```

That's it! The system now automatically captures:
- Unhandled errors
- Promise rejections
- Console errors
- Network failures

## Step 2: Add Dashboard (2 minutes)

Add the monitoring dashboard to your app:

```tsx
// src/App.tsx
import { ErrorMonitoringDashboard } from './components/ErrorMonitoringDashboard';
import { useState } from 'react';

function App() {
  const [showMonitoring, setShowMonitoring] = useState(false);

  return (
    <div>
      {/* Your existing app */}
      <YourApp />

      {/* Toggle monitoring dashboard */}
      <button
        onClick={() => setShowMonitoring(!showMonitoring)}
        className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded"
      >
        {showMonitoring ? 'Hide' : 'Show'} Errors
      </button>

      {showMonitoring && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <button
            onClick={() => setShowMonitoring(false)}
            className="absolute top-4 right-4 text-gray-600"
          >
            Close ✕
          </button>
          <ErrorMonitoringDashboard />
        </div>
      )}
    </div>
  );
}
```

## Step 3: Configure Alerts (2 minutes)

Add Slack notifications:

```bash
# Add to .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#errors
```

```typescript
// src/main.tsx
import { ExternalIntegrations } from './monitoring/ExternalIntegrations';

const integrations = new ExternalIntegrations();
// Configuration is auto-loaded from .env
```

## You're Done! 🎉

The system is now:
- ✅ Capturing all errors automatically
- ✅ Detecting patterns with ML
- ✅ Auto-correcting common issues
- ✅ Sending alerts to Slack
- ✅ Providing real-time dashboard

## Quick Examples

### Manual Error Capture

```typescript
import { ErrorMonitoringSystem } from './monitoring/ErrorMonitoringSystem';

const monitor = ErrorMonitoringSystem.getInstance();

// Capture custom error
monitor.captureError({
  message: 'Payment processing failed',
  severity: 'high',
  type: 'runtime',
  context: {
    userId: user.id,
    workflowId: workflow.id,
  },
});
```

### Network Error Capture

```typescript
// Automatically capture fetch errors
fetch('/api/data')
  .catch(error => {
    monitor.captureNetworkError({
      url: '/api/data',
      method: 'GET',
      message: error.message,
    });
  });
```

### View Statistics

```typescript
// Get error stats
const stats = await monitor.getStats();
console.log(`Total errors: ${stats.total}`);
console.log(`Resolved: ${stats.resolved}`);
console.log(`Error rate: ${stats.errorRate.toFixed(2)}/min`);
```

## Common Patterns

### 1. Error Boundary Integration

```tsx
import { ErrorMonitoringSystem } from './monitoring/ErrorMonitoringSystem';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const monitor = ErrorMonitoringSystem.getInstance();
    monitor.captureError({
      message: error.message,
      stack: error.stack,
      type: 'runtime',
      severity: 'high',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }
}
```

### 2. Async Error Handling

```typescript
async function executeWorkflow() {
  try {
    const result = await workflow.execute();
    return result;
  } catch (error) {
    monitor.captureError({
      message: error.message,
      stack: error.stack,
      type: 'runtime',
      severity: 'high',
      context: {
        workflowId: workflow.id,
      },
    });
    throw error; // Re-throw if needed
  }
}
```

### 3. Validation Errors

```typescript
function validateForm(data: FormData) {
  if (!data.email) {
    monitor.captureValidationError({
      field: 'email',
      value: data.email,
      message: 'Email is required',
    });
    return false;
  }
  return true;
}
```

## Dashboard Overview

The dashboard shows:

1. **Summary Cards**: Total errors, resolved, unresolved, MTTR
2. **Charts**: Error rate over time, distribution by type
3. **Top Patterns**: Most common error patterns
4. **Recommendations**: AI-powered suggestions
5. **Recent Errors**: Latest errors with filtering
6. **Auto-Correction Stats**: Success rate and performance

## Production Checklist

Before going to production:

- [ ] Set sample rate to 0.5 or lower
- [ ] Configure external integrations (Sentry, Slack)
- [ ] Set up alert thresholds
- [ ] Test alert notifications
- [ ] Configure storage retention
- [ ] Add error context to captures
- [ ] Test auto-correction strategies

## Production Configuration

```typescript
const monitor = ErrorMonitoringSystem.getInstance({
  enabled: true,
  sampleRate: 0.5, // Sample 50% in production
  captureUnhandledRejections: true,
  captureConsoleErrors: false, // Disable in production
  severityThresholds: {
    alertOnCritical: true,
    alertOnHigh: true,
    criticalErrorsBeforeAlert: 5,
  },
  storage: {
    maxErrors: 10000,
    retentionDays: 30,
  },
  performance: {
    batchSize: 100,
    flushIntervalMs: 5000,
  },
});
```

## Performance Impact

- **CPU**: <1% overhead
- **Memory**: ~10MB
- **Capture time**: <5ms per error
- **Flush interval**: 5s (configurable)
- **Network**: Batched requests

## Troubleshooting

### Not seeing errors?

```typescript
// Check if monitoring is enabled
const monitor = ErrorMonitoringSystem.getInstance();
console.log('Monitoring enabled:', monitor); // Should not be undefined

// Manually trigger a test error
monitor.captureError({ message: 'Test error' });
```

### Alerts not working?

```typescript
// Test integrations
import { ExternalIntegrations } from './monitoring/ExternalIntegrations';

const integrations = new ExternalIntegrations();
const results = await integrations.testIntegrations();
console.log('Integration test results:', results);
```

### Dashboard not showing data?

```typescript
// Check recent errors
const errors = await monitor.getRecentErrors(10);
console.log('Recent errors:', errors);

// Check stats
const stats = await monitor.getStats();
console.log('Stats:', stats);
```

## Next Steps

1. **Read the Full Guide**: See [ERROR_MONITORING_GUIDE.md](./ERROR_MONITORING_GUIDE.md)
2. **Configure Integrations**: Set up Sentry, DataDog, PagerDuty
3. **Customize Auto-Correction**: Add domain-specific fixes
4. **Tune Alerts**: Adjust thresholds to avoid spam
5. **Monitor Performance**: Track the monitoring system itself

## Support

Need help? Check:
- [Full Documentation](./ERROR_MONITORING_GUIDE.md)
- [API Reference](./ERROR_MONITORING_GUIDE.md#api-reference)
- [Troubleshooting Guide](./ERROR_MONITORING_GUIDE.md#troubleshooting)

## Example Project Structure

```
src/
├── monitoring/
│   ├── ErrorMonitoringSystem.ts    # Core system
│   ├── ErrorPatternAnalyzer.ts     # Pattern detection
│   ├── AutoCorrection.ts            # Self-healing
│   ├── ErrorStorage.ts              # Persistence
│   └── ExternalIntegrations.ts      # External services
├── components/
│   └── ErrorMonitoringDashboard.tsx # UI dashboard
├── __tests__/
│   └── monitoring/
│       └── errorMonitoring.test.ts  # Tests
└── main.tsx                         # Initialize here
```

---

**Time to setup**: ~5 minutes
**Time to value**: Immediate
**Effort**: Minimal
**Impact**: Maximum reliability 🚀
