## Description
<!-- Provide a clear and concise description of your changes -->

### What does this PR do?
<!-- Explain the changes in 2-3 sentences -->

### Why is this change needed?
<!-- Explain the motivation and context -->

## Type of Change
<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 UI/UX improvement
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security fix
- [ ] 🧪 Test coverage improvement
- [ ] 🔧 Configuration change
- [ ] ♻️ Code refactoring
- [ ] 🏗️ Infrastructure change

## Related Issues
<!-- Link to related issues using keywords -->

Closes #
Fixes #
Related to #

## Changes Made
<!-- Provide a detailed list of changes -->

### Core Changes:
-
-

### Files Modified:
<!-- List key files and what changed -->

- `src/components/...` -
- `src/backend/...` -
- `src/types/...` -

### New Files Added:
-
-

### Files Removed:
-
-

## Testing

### Test Coverage
<!-- Check all that apply -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed
- [ ] No tests needed (documentation/config only)

### Test Results
<!-- Provide evidence of testing -->

```bash
# Paste test output here
npm run test
```

**Coverage Report:**
- Lines: ____%
- Functions: ____%
- Branches: ____%

### Manual Testing Steps
<!-- How did you verify this works? -->

1.
2.
3.

### Test Environments
<!-- Where was this tested? -->

- [ ] Local development
- [ ] Development environment
- [ ] Staging environment
- [ ] Docker container
- [ ] Multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile browsers

## Screenshots / Videos
<!-- If applicable, add visual evidence of changes -->

### Before:
<!-- Screenshot or description of old behavior -->

### After:
<!-- Screenshot or description of new behavior -->

## Breaking Changes
<!-- If this is a breaking change, explain the impact and migration path -->

### Impact:
<!-- What will break? -->

### Migration Guide:
<!-- How should users update their workflows/code? -->

```typescript
// Old way:
// ...

// New way:
// ...
```

### Deprecation Warnings:
<!-- If applicable, were deprecation warnings added? -->

- [ ] Deprecation warnings added
- [ ] Migration timeline documented
- [ ] Changelog updated

## Performance Impact
<!-- Does this change affect performance? -->

- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance degraded (justified)
- [ ] Performance not measured

### Benchmarks:
<!-- If applicable, provide before/after metrics -->

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Execution time | | | |
| Memory usage | | | |
| Bundle size | | | |

## Security Considerations
<!-- Have you considered security implications? -->

- [ ] No security impact
- [ ] Security improved
- [ ] New credentials/secrets added (documented)
- [ ] Authentication/authorization changes
- [ ] Input validation added
- [ ] XSS/CSRF protection verified

### Security Checklist:
- [ ] No sensitive data in logs
- [ ] No hardcoded credentials
- [ ] Input sanitization implemented
- [ ] SQL injection prevention
- [ ] RBAC/permissions enforced

## Documentation

### Documentation Updated:
<!-- Check all that apply -->

- [ ] Code comments added/updated
- [ ] README.md updated
- [ ] CLAUDE.md updated (architectural changes)
- [ ] API documentation updated
- [ ] Wiki/guides updated
- [ ] Changelog updated
- [ ] No documentation needed

### New Node Types (if applicable):
<!-- If adding new nodes, ensure complete documentation -->

- [ ] Node added to `src/data/nodeTypes.ts`
- [ ] Configuration component created in `src/workflow/nodes/config/`
- [ ] Registered in `src/workflow/nodeConfigRegistry.ts`
- [ ] Execution logic added to `ExecutionEngine.ts`
- [ ] Node documentation added to wiki

## Deployment Considerations

### Database Changes:
- [ ] No database changes
- [ ] Migration script created (`npm run migrate:dev`)
- [ ] Migration tested on staging
- [ ] Rollback plan documented

### Configuration Changes:
- [ ] No configuration changes
- [ ] Environment variables added (documented in `.env.example`)
- [ ] Configuration validated in all environments

### Dependencies:
- [ ] No new dependencies
- [ ] New dependencies added (justified below)
- [ ] Dependencies updated (breaking changes reviewed)

**New Dependencies:**
| Package | Version | Purpose | Bundle Size Impact |
|---------|---------|---------|-------------------|
| | | | |

## Checklist
<!-- Complete before requesting review -->

### Code Quality:
- [ ] Code follows project style guidelines
- [ ] ESLint passes (`npm run lint`)
- [ ] TypeScript type check passes (`npm run typecheck`)
- [ ] No console.log or debug statements
- [ ] Error handling implemented
- [ ] Edge cases considered

### Testing:
- [ ] All tests pass locally (`npm run test`)
- [ ] New tests added for new functionality
- [ ] Test coverage maintained or improved
- [ ] Integration tests verified
- [ ] E2E tests pass (if applicable)

### Documentation:
- [ ] Code is self-documenting with clear variable/function names
- [ ] Complex logic has explanatory comments
- [ ] Public APIs documented with JSDoc
- [ ] CLAUDE.md updated if architecture changed

### Review:
- [ ] Self-review completed
- [ ] Screenshots/videos attached (if UI changes)
- [ ] Breaking changes documented
- [ ] Migration path provided (if breaking)

### Git:
- [ ] Commits are logical and well-described
- [ ] Branch is up-to-date with main/master
- [ ] No merge conflicts
- [ ] Commit messages follow convention

## Additional Notes
<!-- Any other information for reviewers -->

### Known Limitations:
-

### Future Improvements:
-

### Questions for Reviewers:
-

---

## For Reviewers

### Review Checklist:
- [ ] Code logic is sound
- [ ] Tests are comprehensive
- [ ] Documentation is clear
- [ ] Performance is acceptable
- [ ] Security is not compromised
- [ ] Breaking changes are justified
- [ ] Deployment plan is solid

### Review Comments:
<!-- Reviewers: Add your feedback here -->
