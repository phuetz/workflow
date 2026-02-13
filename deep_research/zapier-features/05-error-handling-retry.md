# Error Handling and Retry Logic

## Overview

Zapier provides comprehensive error handling and automatic retry capabilities to ensure workflow reliability and enable proactive troubleshooting.

## Autoreplay (Automatic Retry)

### How Autoreplay Works
- When a step fails, Zapier automatically replays the step up to **5 times**
- Uses exponential backoff between retry attempts
- Final replay occurs approximately **10 hours 35 minutes** after first error

### Retry Schedule
| Attempt | Approximate Time After First Error |
|---------|-----------------------------------|
| 1 | Immediate |
| 2 | ~10 minutes |
| 3 | ~30 minutes |
| 4 | ~2 hours |
| 5 | ~10 hours 35 minutes |

### Enabling Autoreplay
- Must be account super admin or owner
- Navigate to Zap History > Zap Runs tab
- Toggle Autoreplay switch on
- Available on **Professional, Team, and Company plans** only

### Per-Zap Override (Enterprise)
- Available only in Zapier for Companies accounts
- Override account-wide Autoreplay settings per Zap
- Options:
  - **Always replay**: Zap always autoreplays on error
  - **Never replay**: Zap never autoreplays on error

### Autoreplay Behavior
- Checks Zap state before each retry attempt
- If Zap is off or Autoreplay disabled, retry is cancelled
- No error notification emails sent while Autoreplay is active
- After final failed attempt, error email is sent

## Manual Replay

### Replay Zap Runs
- Manually replay failed runs from Zap History
- Replay individual steps or entire run
- Must replay within **60 days** of original trigger

### Replay Limitations
- Cannot replay if Zap significantly changed:
  - Deleted steps
  - Added steps
  - Moved steps
  - Deleted entire Zap
- Edited Zaps use current version for future Autoreplay attempts

## Error Handler (Proactive Error Handling)

### What Is Error Handler?
- Built-in feature for controlling Zap behavior on errors
- Define custom actions when errors occur
- Proactive troubleshooting for critical Zaps

### Error Handler Actions
- Send notification (email, Slack, etc.)
- Continue with default value
- Halt and notify
- Run alternative actions

### Important Note
- Zaps with Error Handler **do not autoreplay**
- Choose between automatic retry or custom handling

## Zapier Manager

### Error Monitoring
- Monitor Zaps from a centralized location
- Trigger alerts when Zap errors occur
- Automate error responses with dedicated Zaps

### Manager Triggers
- New Zap error
- Zap turned off
- Zap quota reached
- Task usage alerts

## Error Types

### Common Error Categories
1. **Connection errors**: App authentication failed
2. **Rate limit errors**: Too many requests to app
3. **Data errors**: Invalid or missing data
4. **Timeout errors**: Request took too long
5. **App errors**: Downstream app issues

### Handling Strategies by Error Type
| Error Type | Recommended Strategy |
|------------|---------------------|
| Rate limit | Autoreplay (backoff helps) |
| Temporary outage | Autoreplay |
| Authentication | Manual fix, then replay |
| Data validation | Error handler with notification |
| Permanent failure | Error handler with alternative action |

## Best Practices

### 1. Enable Autoreplay for Transient Errors
- Network issues
- Temporary service outages
- Rate limiting

### 2. Use Error Handler for Critical Paths
- Payment processing
- Customer communications
- Data synchronization

### 3. Monitor with Zapier Manager
- Set up error notification Zaps
- Track Zap health proactively
- Create escalation workflows

### 4. Test Error Scenarios
- Simulate failures in testing
- Verify error handling works
- Document error responses

### 5. Keep Zaps Simple
- Fewer steps = fewer failure points
- Use Sub-Zaps for complex logic
- Easier debugging when errors occur

## Error Prevention

### Validation Steps
- Add filters to validate data before actions
- Use Formatter to clean data
- Handle null/empty values explicitly

### Connection Health
- Regularly verify app connections
- Set up connection monitoring
- Use Zapier Manager for alerts

### Idempotency
- Design Zaps to handle duplicate runs safely
- Use searches before creates
- Implement "search or create" pattern

## Zap History

### Viewing Errors
- Access from Zap editor or dashboard
- View complete run details
- See step-by-step execution

### Error Details
- Error message from app
- Input data that caused error
- Timestamp and retry status
- Replay options

### Retention
- History available for 60 days
- Download logs for longer retention
- Use webhooks for external logging

## Competitive Features Summary

| Feature | Zapier Capability |
|---------|-------------------|
| Auto retry | Up to 5 attempts with backoff |
| Max retry window | ~10 hours 35 minutes |
| Manual replay | Within 60 days |
| Error handler | Custom error actions |
| Error monitoring | Zapier Manager |
| Per-Zap settings | Enterprise only |
| Error notifications | Email, Slack, SMS, etc. |

## Sources

- [Replay Zap runs - Zapier](https://help.zapier.com/hc/en-us/articles/8496241726989-Replay-Zap-runs)
- [Decide how your Zap handles errors - Zapier](https://help.zapier.com/hc/en-us/articles/14167175792909-Decide-how-your-Zap-handles-errors-with-advanced-settings)
- [Introducing error handling for your Zaps - Zapier](https://zapier.com/blog/zap-error-handling/)
- [What is replay? - Zapier](https://help.zapier.com/hc/en-us/articles/19220226086797-What-is-replay)
- [Autoreplay Tasks - Zapier](https://zapier.com/help/autoreplay/)
