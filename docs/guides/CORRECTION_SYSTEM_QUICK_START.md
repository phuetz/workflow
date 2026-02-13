# Safe Correction System - Quick Start

**5-Minute Setup Guide**

---

## What Is This?

A **safe** error detection and recommendation system that:
- ✅ **Detects** errors automatically
- ✅ **Recommends** fixes with step-by-step instructions
- ❌ **NEVER** applies fixes automatically (requires human approval)

---

## Quick Start

### 1. Start Monitoring (1 minute)

```bash
npm run monitor:errors
```

You'll see:
```
✅ Error Monitoring System Started
📊 Registered correctors:
  - NetworkErrorCorrector
  - MemoryErrorCorrector
  - DatabaseErrorCorrector

👀 Monitoring for errors...
```

### 2. Try Demo Mode (2 minutes)

```bash
npm run monitor:demo
```

This simulates 3 errors and generates recommendations:
- Network timeout
- Database connection error
- Memory issue

Output:
```
🎬 Running in demo mode with simulated errors

Simulating network timeout...
💡 Correction recommendation generated

Simulating database connection error...
💡 Correction recommendation generated

Simulating memory issue...
💡 Correction recommendation generated

✅ Demo complete! Check recommendations in dashboard.

📋 Generated 3 recommendations:
Network Timeout (safe)
  Request timed out waiting for response from remote server
  4 steps to fix
...
```

### 3. View Dashboard (2 minutes)

Open: `http://localhost:3000/corrections`

**Dashboard shows**:
- Total errors detected
- Recommendations generated
- Filter by impact (safe/moderate/risky)
- Click recommendation for details

**Click a recommendation to see**:
- Error type and description
- Step-by-step fix instructions
- Commands to copy/paste
- Code examples
- Validation checks
- Rollback plan

---

## Real Usage Example

### Scenario: High Memory Alert

**1. System detects issue:**
```
⚠️ High memory usage: 850MB / 1000MB (85%)
💡 Memory optimization recommendation generated
```

**2. Open dashboard:**
- See "High Memory Usage" card
- Impact: Moderate
- 5 steps provided

**3. Click to see details:**
```
Step 1: Analyze with heap dump
  node --expose-gc --inspect server.js

Step 2: Generate heap snapshot
  (Use Chrome DevTools Memory tab)

Step 3: Implement memory limits
  const cache = new LRU({
    max: 1000,
    maxSize: 100 * 1024 * 1024
  });

Step 4: Enable stream processing
  (Code example provided)

Step 5: Add monitoring alerts
  (Code example provided)
```

**4. Apply manually:**
- Test in staging first
- Copy commands/code
- Apply changes
- Monitor result

---

## Configuration

Edit `config/auto-corrections.json`:

```json
{
  "enabled": true,
  "mode": "recommendation-only",
  "notifications": {
    "slack": {
      "enabled": true,
      "webhook": "${SLACK_WEBHOOK_URL}"
    }
  },
  "monitoring": {
    "memoryCheck": {
      "interval": 60000,
      "thresholds": {
        "warning": 70,
        "critical": 85
      }
    }
  }
}
```

---

## Safety Features

### 1. Never Auto-Applies
```typescript
// System ONLY generates recommendations
const recommendation = await correctionOrchestrator.analyzeError(error);
// ✅ Sends notification to humans
await notifyHumans(recommendation);
// ❌ NEVER: await applyCorrection(recommendation);
```

### 2. Requires Review
- All recommendations appear in dashboard
- Humans review before applying
- Test in staging first
- Monitor after applying

### 3. Validation & Rollback
- Pre-flight checks included
- Risk assessment provided
- Rollback plan generated
- Safety warnings shown

---

## Common Commands

### Monitoring
```bash
# Start monitoring
npm run monitor:errors

# Demo mode
npm run monitor:demo

# Run tests
npm run corrections:test
```

### Manual Scripts (after reviewing recommendations)
```bash
# Memory optimization (dry-run first)
./scripts/manual-corrections/memory-optimization.sh --dry-run
./scripts/manual-corrections/memory-optimization.sh
```

---

## What Errors Are Handled?

### Network Errors
- Connection timeouts (ETIMEDOUT)
- Connection refused (ECONNREFUSED)
- Connection reset (ECONNRESET)

**Recommendations:**
- Retry strategies
- Fallback endpoints
- Connection pooling
- Caching

### Memory Errors
- Out of memory (ENOMEM)
- High usage (>70%)
- Memory leaks

**Recommendations:**
- Heap size increase
- Cache limits
- Stream processing
- GC strategies

### Database Errors
- Connection failures
- Too many connections
- Deadlocks
- Lock timeouts

**Recommendations:**
- Connection pooling
- Retry logic
- Query optimization
- Transaction management

---

## Adding Custom Correctors

Create new corrector:

```typescript
import { ErrorCorrector } from '@/monitoring/corrections/CorrectionFramework';

export class MyCorrector extends ErrorCorrector {
  readonly name = 'MyCorrector';
  readonly category = 'custom';

  canHandle(error: ErrorContext): boolean {
    return error.error.message.includes('MY_ERROR');
  }

  async analyze(error: ErrorContext): Promise<CorrectionRecommendation> {
    return {
      id: `custom-${Date.now()}`,
      errorType: 'My Error Type',
      description: 'What happened',
      steps: [
        {
          order: 1,
          description: 'First fix step',
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

  async validateCorrection(rec: CorrectionRecommendation) {
    return { safe: true, warnings: [], risks: [], testResults: [] };
  }

  async generateRollbackPlan(rec: CorrectionRecommendation) {
    return [];
  }
}
```

Register it:
```typescript
import { MyCorrector } from './MyCorrector';
correctionOrchestrator.registerCorrector(new MyCorrector());
```

---

## Troubleshooting

### Dashboard not showing recommendations?

Check if monitoring is running:
```bash
ps aux | grep monitor-and-recommend
```

### No errors detected?

Trigger test errors:
```bash
npm run monitor:demo
```

### Need more details?

Check comprehensive guide:
```bash
less SAFE_CORRECTION_SYSTEM_GUIDE.md
```

---

## Important Rules

### ✅ DO:
- Review all recommendations before applying
- Test in staging/dev first
- Monitor after applying
- Document changes
- Have rollback plan ready

### ❌ DON'T:
- Apply fixes without understanding
- Run in production first
- Skip testing phase
- Ignore validation warnings
- Forget to monitor

---

## Next Steps

1. **Start monitoring now**
   ```bash
   npm run monitor:errors &
   ```

2. **Configure notifications**
   - Add Slack webhook
   - Set up email alerts
   - Enable dashboard

3. **Train team**
   - Share this quick start
   - Run demo mode together
   - Practice applying fixes in staging

4. **Add custom correctors**
   - Identify common errors
   - Create correctors
   - Test thoroughly

---

## Support

- **Guide**: SAFE_CORRECTION_SYSTEM_GUIDE.md (detailed documentation)
- **Report**: SAFE_CORRECTION_SYSTEM_REPORT.md (full implementation details)
- **Tests**: `npm run corrections:test`
- **Demo**: `npm run monitor:demo`

---

## Summary

```
Error → Detection → Analysis → Recommendation → Human Review → Manual Application
  ↓         ↓           ↓              ↓                ↓               ↓
 Auto      Auto       Auto          Auto          Required        Required
```

**Key Point**: System automates detection and recommendations, but **humans control application** of fixes.

---

**Status**: ✅ Production-Ready
**Safety**: 🟢 Zero risk of automatic application
**Setup Time**: ⏱️ 5 minutes
