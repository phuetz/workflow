# GitHub Templates - Usage Examples

This document provides concrete examples of how to use the new GitHub templates effectively.

---

## Bug Report Example

### Good Bug Report ✅

```markdown
## Bug Description
When executing a workflow with an HTTP Request node configured to use OAuth2 authentication,
the execution fails with a "Token expired" error even though the token should be auto-refreshed.

## Steps to Reproduce
1. Create a new workflow
2. Add HTTP Request node
3. Configure OAuth2 credentials with auto-refresh enabled
4. Set token expiry to 1 hour
5. Wait for token to expire
6. Execute workflow
7. Observe error: "OAuth2 token expired"

## Expected Behavior
The HTTP Request node should automatically refresh the OAuth2 token when it expires
and retry the request with the new token.

## Actual Behavior
The node fails immediately with "OAuth2 token expired" error without attempting to refresh.

## Screenshots
[Screenshot of error in execution panel]

## Environment Information
- **Version**: 1.2.5
- **Environment**: Production
- **Browser**: Chrome 120.0.6099.109
- **OS**: macOS 14.2

- **Node.js Version**: 20.10.0
- **Database**: PostgreSQL 15.4
- **Redis Version**: 7.2.0

## Workflow Context
- **Workflow ID**: wf_abc123
- **Node Type(s)**: HTTP Request
- **Execution ID**: exec_xyz789

## Error Messages
```
Error: OAuth2 token expired
  at OAuth2Service.getToken (/src/backend/auth/OAuth2Service.ts:145)
  at HttpRequestNode.execute (/src/workflow/nodes/config/HttpRequestConfig.tsx:89)
  at ExecutionEngine.executeNode (/src/components/ExecutionEngine.ts:234)
```
```

### What Makes It Good?
- ✅ Clear, concise description
- ✅ Exact reproduction steps
- ✅ Complete environment info
- ✅ Workflow context (IDs)
- ✅ Full error stack trace
- ✅ Expected vs actual behavior

---

## Feature Request Example

### Good Feature Request ✅

```markdown
## Feature Description
Add support for Notion Database as a trigger node that monitors for new/updated pages
and starts workflow execution automatically.

## Use Case / Problem Statement
**Current Limitation:**
Currently, users must manually trigger workflows or use scheduled polling to check
Notion databases for changes. This results in delays (up to polling interval) and
wastes resources on unnecessary checks.

**Desired Outcome:**
Users should be able to set up a trigger that listens for Notion webhooks and
automatically executes workflows when:
- New page is created in a database
- Existing page is updated
- Page property matches certain conditions

## Proposed Solution

### Feature Type
- [x] New Node Type / Integration

### Detailed Design

#### For New Node Types:
- **Service/API**: Notion API v2
- **Authentication Method**: OAuth2 (already implemented for Notion nodes)
- **Key Operations**:
  - Subscribe to database changes (webhook)
  - Filter by property values
  - Debouncing for rapid updates

**Implementation Sketch:**
```typescript
{
  type: 'notion-trigger',
  config: {
    database_id: 'abc123',
    trigger_on: ['created', 'updated'],
    filters: [
      { property: 'Status', operator: 'equals', value: 'Published' }
    ],
    debounce_ms: 5000
  }
}
```

## Alternatives Considered

### Alternative 1: Scheduled Polling
**Pros:**
- Simple implementation
- No webhook setup required

**Cons:**
- Delays up to polling interval
- Wastes resources checking when no changes
- Not real-time

### Alternative 2: Zapier-style Instant Triggers
**Pros:**
- Real-time execution
- Standard pattern used by competitors

**Cons:**
- Requires webhook infrastructure
- Notion API rate limits

## Examples & References

### Similar Features in Other Tools:
- **n8n**: [Notion Trigger](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.notiontrigger/)
  - How they implement it: Webhook-based with polling fallback
  - What we could improve: Better filtering, debouncing

- **Zapier**: Notion "New Database Item" trigger
  - Instant triggers with 15-min polling fallback

## Impact & Benefits

### User Benefits:
- Real-time workflow execution (vs up to 15 min delay)
- Reduced execution costs (no unnecessary polling)
- New use cases: Content publishing workflows, team notifications

### Technical Benefits:
- Standard webhook pattern (reusable for other integrations)
- Efficient resource usage
- Better user experience

### Target Audience:
- [x] All users
- [x] Business users (content teams, project managers)

## Implementation Complexity
- [x] Large (1-2 weeks)

**Breakdown:**
- Webhook infrastructure: 3 days
- Notion trigger node: 2 days
- Testing and documentation: 2 days
- Debouncing and filtering: 1 day

## Priority & Urgency
- [x] High - Frequently needed

**Justification:**
- 15+ user requests in community discussions
- Competitive feature (n8n, Zapier, Make all have this)
- Unlocks high-value use cases

## Willing to Contribute
- [x] Yes, I can help test
- [x] Yes, I can help with documentation
```

### What Makes It Good?
- ✅ Clear use case with business value
- ✅ Detailed implementation design
- ✅ Alternatives analysis with pros/cons
- ✅ References to competitors
- ✅ Impact quantified (15+ requests)
- ✅ Realistic effort estimate
- ✅ Willingness to contribute

---

## Pull Request Example

### Good Pull Request ✅

```markdown
## Description
This PR adds auto-refresh capability to OAuth2 credentials for HTTP Request nodes,
fixing issue #123 where expired tokens caused execution failures.

### What does this PR do?
Implements automatic token refresh when OAuth2 tokens expire, with configurable
retry logic and graceful degradation if refresh fails.

### Why is this change needed?
Users reported frequent execution failures due to expired OAuth2 tokens, especially
for long-running workflows or workflows executed after token expiry (1-2 hours).

## Type of Change
- [x] 🐛 Bug fix (non-breaking change that fixes an issue)
- [x] ⚡ Performance improvement

## Related Issues
Closes #123
Fixes #456
Related to #789

## Changes Made

### Core Changes:
- Added token expiry checking before HTTP requests
- Implemented automatic token refresh with retry logic
- Added token caching to reduce refresh API calls
- Added configurable refresh buffer (default: 5 minutes before expiry)

### Files Modified:
- `src/backend/auth/OAuth2Service.ts` - Token refresh logic
- `src/workflow/nodes/config/HttpRequestConfig.tsx` - Auto-refresh integration
- `src/types/credentials.ts` - Added refresh configuration types

### New Files Added:
- `src/backend/auth/__tests__/OAuth2Refresh.test.ts` - Test suite

## Testing

### Test Coverage
- [x] Unit tests added/updated
- [x] Integration tests added/updated
- [x] Manual testing completed

### Test Results
```bash
npm run test

PASS  src/backend/auth/__tests__/OAuth2Refresh.test.ts
  OAuth2 Token Refresh
    ✓ should refresh token when expired (45ms)
    ✓ should use cached token when valid (12ms)
    ✓ should retry on refresh failure (89ms)
    ✓ should fallback gracefully if refresh fails (34ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

**Coverage Report:**
- Lines: 94.2%
- Functions: 96.8%
- Branches: 87.5%

### Manual Testing Steps
1. Created workflow with Google Sheets HTTP Request node
2. Configured OAuth2 with 1-hour token expiry
3. Waited for token to expire (fast-forwarded system time)
4. Executed workflow
5. Verified automatic token refresh (logs show refresh attempt)
6. Confirmed successful API call with new token

### Test Environments
- [x] Local development
- [x] Development environment
- [x] Staging environment
- [x] Multiple browsers (Chrome, Firefox)

## Screenshots

### Before:
![Error on expired token](before.png)

### After:
![Automatic refresh success](after.png)

## Breaking Changes
- [ ] No breaking changes

## Performance Impact
- [x] Performance improved

### Benchmarks:
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Execution time (expired token) | 2.3s (failure) | 2.8s (success) | +0.5s |
| API calls | 1 (failed) | 2 (refresh + request) | +1 call |
| Success rate | 0% (expired) | 100% | +100% |

**Analysis**: Slight performance overhead (+0.5s) for token refresh, but eliminates
failures entirely. Net positive for user experience.

## Security Considerations
- [x] Security improved

### Security Checklist:
- [x] No sensitive data in logs (tokens redacted)
- [x] No hardcoded credentials
- [x] Input sanitization implemented
- [x] Refresh tokens encrypted in database
- [x] RBAC/permissions enforced

**Details:**
- Refresh tokens stored encrypted using AES-256-GCM
- Token refresh limited to credential owner only
- All OAuth2 calls over HTTPS
- Tokens never logged (redacted in debug output)

## Documentation

### Documentation Updated:
- [x] Code comments added/updated
- [x] API documentation updated
- [x] No changes to CLAUDE.md needed

### Code Comments:
Added JSDoc comments to:
- `OAuth2Service.refreshToken()`
- `OAuth2Service.shouldRefreshToken()`
- `OAuth2Service.getCachedToken()`

## Deployment Considerations

### Database Changes:
- [x] No database changes

### Configuration Changes:
- [x] Environment variables added (documented in `.env.example`)

**New Variables:**
```bash
# OAuth2 Token Refresh Configuration
OAUTH2_REFRESH_BUFFER_SECONDS=300  # Refresh 5 min before expiry
OAUTH2_REFRESH_RETRY_MAX=3         # Max retry attempts
```

### Dependencies:
- [x] No new dependencies

## Checklist

### Code Quality:
- [x] Code follows project style guidelines
- [x] ESLint passes (`npm run lint`)
- [x] TypeScript type check passes (`npm run typecheck`)
- [x] No console.log or debug statements
- [x] Error handling implemented
- [x] Edge cases considered

### Testing:
- [x] All tests pass locally (`npm run test`)
- [x] New tests added for new functionality
- [x] Test coverage maintained (94%+)
- [x] Integration tests verified
- [x] Manual testing completed

### Documentation:
- [x] Code is self-documenting with clear variable/function names
- [x] Complex logic has explanatory comments
- [x] Public APIs documented with JSDoc

### Review:
- [x] Self-review completed
- [x] Screenshots attached
- [x] No breaking changes
- [x] Performance impact assessed

### Git:
- [x] Commits are logical and well-described
- [x] Branch is up-to-date with main
- [x] No merge conflicts

## Additional Notes

### Future Improvements:
- Could add configurable refresh buffer per credential
- Could implement token refresh queue to batch refresh calls
- Could add Prometheus metrics for refresh success/failure rates
```

### What Makes It Good?
- ✅ Clear description of what and why
- ✅ Complete testing evidence with coverage numbers
- ✅ Security considerations documented
- ✅ Performance impact quantified
- ✅ All checklists completed
- ✅ Screenshots showing before/after
- ✅ Environment variables documented

---

## Bad Examples (What to Avoid)

### Bad Bug Report ❌

```markdown
## Bug
It doesn't work

## Steps
1. Click the button
2. Error

## Environment
Windows
```

**Problems:**
- ❌ Vague description
- ❌ No reproduction steps
- ❌ No environment details
- ❌ No error logs
- ❌ No workflow context

### Bad Feature Request ❌

```markdown
## Feature
Add Notion support

It would be cool to have Notion.
```

**Problems:**
- ❌ No use case
- ❌ No detailed design
- ❌ No alternatives
- ❌ No impact analysis
- ❌ No effort estimate

### Bad Pull Request ❌

```markdown
## Description
Fixed stuff

## Changes
- Changed some files
- Added code
```

**Problems:**
- ❌ Vague description
- ❌ No testing evidence
- ❌ No checklists completed
- ❌ No security consideration
- ❌ No documentation

---

## Tips for Quality Issues & PRs

### Bug Reports
1. **Be Specific**: "OAuth2 token expired" not "authentication failed"
2. **Provide Context**: Workflow ID, node types, execution ID
3. **Include Logs**: Full stack traces, not just error messages
4. **Environment Details**: Exact versions, not "latest"

### Feature Requests
1. **Start with Why**: Explain the problem, not just the solution
2. **Research First**: Check if similar features exist
3. **Quantify Impact**: How many users need this?
4. **Estimate Effort**: Help maintainers prioritize

### Pull Requests
1. **Test Thoroughly**: Unit + integration + manual testing
2. **Document Security**: Always consider security implications
3. **Show Evidence**: Screenshots, test output, benchmarks
4. **Complete Checklists**: Every checkbox matters

---

## Template Customization

### For Specific Node Types
When requesting a new node type, include:

```markdown
### Node Type Details
- **Category**: Communication / Database / AI / etc.
- **Authentication**: OAuth2 / API Key / Basic Auth
- **Rate Limits**: Known API limitations
- **Webhooks**: Does API support webhooks?
- **Polling**: Fallback to polling if no webhooks?

### API Documentation
- Link to official API docs
- Link to authentication guide
- Known limitations or quirks
```

### For Security Issues
**NEVER create public issues for security vulnerabilities!**

Use GitHub's private security advisory feature:
```
Repository → Security → Advisories → New draft security advisory
```

Include:
- Vulnerability description
- Affected versions
- Reproduction steps (for maintainers only)
- Suggested fix (if known)

---

## Questions?

- 📚 **Documentation**: See GITHUB_TEMPLATES_REPORT.md (comprehensive guide)
- 🚀 **Quick Start**: See GITHUB_TEMPLATES_QUICK_START.md (TL;DR)
- 💬 **Discussions**: GitHub Discussions for questions
- 🐛 **Bugs**: Use bug report template
- ✨ **Features**: Use feature request template

---

**Last Updated**: 2025-10-24
**Version**: 1.0
