# Safe Error Correction System - User Guide

## ⚠️ Important Notice

**This system DOES NOT apply fixes automatically.**

All corrections require human review and manual approval. This follows the project's strict rule against automatic correction scripts after **10 previous regressions** caused by untested automated fixes.

## Overview

The Safe Error Correction System provides:

✅ **Automatic error detection**
✅ **Intelligent analysis and categorization**
✅ **Detailed correction recommendations**
✅ **Step-by-step fix instructions**
✅ **Validation in test environment**
✅ **Rollback plans**
❌ **NO automatic application of fixes**

## Architecture

```
Error Occurs
    ↓
CorrectionOrchestrator detects
    ↓
Finds appropriate Corrector
    ↓
Analyzes error & generates recommendation
    ↓
Validates in test environment
    ↓
Notifies human via Dashboard/Slack/Email
    ↓
Human reviews & manually applies fix
    ↓
System monitors result
```

## Quick Start

### 1. Start the monitoring system

```bash
npm run monitor:errors
```

Or for demonstration mode:

```bash
npm run monitor:errors -- --demo
```

### 2. View recommendations in dashboard

Open the Correction Dashboard in your browser:

```
http://localhost:3000/corrections
```

### 3. Review recommendations

- Filter by impact level (safe, moderate, risky)
- Click on a recommendation to see details
- Review all steps before applying

### 4. Apply fixes manually

Copy commands/code from the recommendation and apply them carefully:

1. Test in development environment first
2. Review all code changes
3. Run validation checks
4. Monitor after applying
5. Have rollback plan ready

## Components

### CorrectionFramework.ts

Core framework that orchestrates error detection and recommendation generation.

**Key Classes:**
- `ErrorCorrector`: Base class for all correctors
- `CorrectionOrchestrator`: Main coordinator
- `CorrectionRecommendation`: Recommendation data structure

### Specific Correctors

#### NetworkCorrector.ts

Handles network-related errors:
- Connection timeouts (ETIMEDOUT)
- Connection refused (ECONNREFUSED)
- Connection reset (ECONNRESET)

**Recommendations include:**
- Retry strategies with exponential backoff
- Fallback endpoints
- Connection pooling
- Caching strategies

#### MemoryCorrector.ts

Handles memory issues:
- Out of memory errors
- High memory usage (>70%)
- Memory leaks

**Recommendations include:**
- Heap size adjustments
- Cache limits
- Stream processing
- Garbage collection strategies
- Memory profiling

#### DatabaseCorrector.ts

Handles database errors:
- Connection failures
- Too many connections
- Deadlocks
- Lock timeouts

**Recommendations include:**
- Connection pooling configuration
- Query optimization
- Transaction retry logic
- Lock management strategies

### Dashboard (CorrectionDashboard.tsx)

React component providing:
- Real-time error statistics
- Recommendation list with filtering
- Detailed recommendation viewer
- Error history
- Copy-to-clipboard for commands

## Configuration

Edit `config/auto-corrections.json`:

```json
{
  "enabled": true,
  "mode": "recommendation-only",
  "notifications": {
    "slack": { "enabled": true },
    "email": { "enabled": true }
  },
  "monitoring": {
    "memoryCheck": {
      "interval": 60000,
      "thresholds": { "warning": 70, "critical": 85 }
    }
  }
}
```

## Adding New Correctors

Create a new corrector by extending `ErrorCorrector`:

```typescript
import { ErrorCorrector, ErrorContext, CorrectionRecommendation } from './CorrectionFramework';

export class MyCustomCorrector extends ErrorCorrector {
  readonly name = 'MyCustomCorrector';
  readonly category = 'custom';

  canHandle(error: ErrorContext): boolean {
    // Return true if this corrector can handle the error
    return error.error.message.includes('MY_ERROR_PATTERN');
  }

  async analyze(error: ErrorContext): Promise<CorrectionRecommendation> {
    return {
      id: `custom-${Date.now()}`,
      errorType: 'My Custom Error',
      description: 'Description of the error',
      steps: [
        {
          order: 1,
          description: 'First step to fix',
          command: 'command to run',
          estimatedDuration: 60,
        },
      ],
      estimatedImpact: 'safe',
      requiresRestart: false,
      requiresDowntime: false,
      validationChecks: [],
      rollbackPlan: [],
    };
  }

  async validateCorrection(recommendation: CorrectionRecommendation) {
    // Validate the recommendation
    return {
      safe: true,
      warnings: [],
      risks: [],
      testResults: [],
    };
  }

  async generateRollbackPlan(recommendation: CorrectionRecommendation) {
    // Generate rollback steps
    return [];
  }
}
```

Register it in `scripts/monitor-and-recommend.ts`:

```typescript
import { MyCustomCorrector } from '../src/monitoring/corrections/MyCustomCorrector';
correctionOrchestrator.registerCorrector(new MyCustomCorrector());
```

## NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "monitor:errors": "tsx scripts/monitor-and-recommend.ts",
    "monitor:demo": "tsx scripts/monitor-and-recommend.ts --demo",
    "corrections:dashboard": "# Open dashboard at /corrections route"
  }
}
```

## Notifications

### Slack Integration

Configure webhook in environment:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Email Notifications

Configure SMTP in environment:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Best Practices

### 1. Always Review Before Applying

❌ **DON'T**: Copy-paste commands without understanding
✅ **DO**: Read and understand each step

### 2. Test in Staging First

❌ **DON'T**: Apply fixes directly to production
✅ **DO**: Test in development/staging environment

### 3. Have Rollback Plan

❌ **DON'T**: Apply fixes without knowing how to revert
✅ **DO**: Review and understand rollback steps

### 4. Monitor After Applying

❌ **DON'T**: Apply fix and forget
✅ **DO**: Monitor logs, metrics, and errors for 30+ minutes

### 5. Document Changes

❌ **DON'T**: Apply fixes without documenting
✅ **DO**: Log what was applied, when, and why

## Example Workflow

### Scenario: High Memory Usage Detected

1. **System detects issue:**
   ```
   ⚠️ High memory usage: 850MB / 1000MB (85%)
   💡 Memory optimization recommendation generated
   ```

2. **Review in dashboard:**
   - Navigate to Corrections Dashboard
   - See "High Memory Usage" recommendation
   - Impact: Moderate
   - 5 steps provided

3. **Review steps:**
   - Step 1: Analyze with heap dump
   - Step 2: Generate heap snapshot
   - Step 3: Implement memory limits
   - Step 4: Enable stream processing
   - Step 5: Add monitoring alerts

4. **Apply in staging:**
   ```bash
   # In staging environment
   node --expose-gc --inspect server.js
   # Generate heap snapshot in Chrome DevTools
   # Review large objects
   ```

5. **Implement fixes:**
   ```typescript
   // Add memory limits
   const cache = new LRU({
     max: 1000,
     maxSize: 100 * 1024 * 1024,
   });
   ```

6. **Test and validate:**
   - Run tests: `npm test`
   - Check memory usage: `pm2 monit`
   - Load test: `npm run test:load`

7. **Apply to production:**
   - Schedule during maintenance window
   - Apply changes
   - Monitor for 1 hour
   - Rollback if issues

8. **Document:**
   - Log fix in incident report
   - Update runbook
   - Share learnings with team

## Statistics and Reporting

View statistics:

```typescript
const stats = correctionOrchestrator.getStatistics();
console.log(stats);
```

Output:
```json
{
  "totalErrors": 42,
  "errorsByType": {
    "NetworkError": 15,
    "DatabaseError": 12,
    "MemoryError": 10,
    "Other": 5
  },
  "errorsBySeverity": {
    "critical": 3,
    "high": 8,
    "medium": 18,
    "low": 13
  },
  "recommendationsGenerated": 38
}
```

## Troubleshooting

### Corrector not detecting errors

Check if error pattern is registered:

```typescript
// In your corrector
canHandle(error: ErrorContext): boolean {
  console.log('Checking error:', error.error.message);
  return error.error.message.includes('YOUR_PATTERN');
}
```

### Validation failing

Check validation logic:

```typescript
async validateCorrection(recommendation: CorrectionRecommendation) {
  const result = { safe: true, warnings: [], risks: [], testResults: [] };

  // Add debug logging
  console.log('Validating:', recommendation.id);

  // Run checks
  for (const check of recommendation.validationChecks) {
    try {
      const passed = await check.check();
      console.log('Check', check.name, 'passed:', passed);
    } catch (error) {
      console.error('Check failed:', error);
    }
  }

  return result;
}
```

### Dashboard not showing recommendations

Check if orchestrator is running:

```bash
# Verify monitoring system is active
ps aux | grep monitor-and-recommend

# Check logs
tail -f logs/corrections.log
```

## Security Considerations

### Approval Requirements

All corrections with impact level "moderate" or "risky" require explicit approval.

### Audit Logging

All recommendations and their outcomes are logged:

```typescript
{
  "timestamp": "2025-01-23T10:30:00Z",
  "recommendationId": "net-timeout-1234567890",
  "appliedBy": "john.doe",
  "result": "success",
  "changes": ["Updated timeout configuration", "Added retry logic"]
}
```

### Prevent Automatic Application

The system is designed to NEVER auto-apply fixes:

```typescript
// This is enforced in code
if (config.preventAutoApply === true) {
  // Only generate recommendation, never apply
  await notifyHumans(recommendation);
  return; // Stop here - do not apply
}
```

## Support

For issues or questions:
1. Check logs: `logs/corrections.log`
2. Review dashboard: `/corrections`
3. Check configuration: `config/auto-corrections.json`
4. Contact DevOps team

## License

This system follows the project's security guidelines and the strict rule:
**NO AUTOMATIC CORRECTIONS without human validation.**
