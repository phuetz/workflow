# Contributing to Workflow Automation Platform

First off, thank you for considering contributing to our workflow automation platform! It's people like you that make this tool such a great solution for the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [How Can I Contribute?](#how-can-i-contribute)
- [Style Guides](#style-guides)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0 (required for Vite 7.0)
- **npm**: >= 9.0.0
- **PostgreSQL**: 15+ (for database)
- **Redis**: 7+ (for caching and queues)
- **Git**: Latest version

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/workflow.git
   cd workflow
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/workflow.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Set up the database**:
   ```bash
   npm run migrate:dev
   npm run seed
   ```

7. **Start development servers**:
   ```bash
   npm run dev  # Starts both frontend and backend
   ```

8. **Verify setup**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/health

## Development Workflow

### Branch Naming Convention

- **Feature**: `feature/description-of-feature`
- **Bug Fix**: `fix/description-of-bug`
- **Documentation**: `docs/description-of-change`
- **Performance**: `perf/description-of-improvement`
- **Refactor**: `refactor/description-of-change`
- **Tests**: `test/description-of-tests`

### Creating a Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/OWNER/workflow/issues) to avoid duplicates.

**When submitting a bug report, include**:
- **Clear descriptive title**
- **Exact steps to reproduce** the problem
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Node version, browser)
- **Error messages and stack traces**
- **Relevant workflow configuration** (if applicable)

**Template**:
```markdown
## Description
[Clear description of the bug]

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Environment
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 20.10.0]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 1.0.0]

## Additional Context
[Screenshots, logs, workflow JSON, etc.]
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues.

**When suggesting an enhancement, include**:
- **Clear use case**: Why is this needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**: What other approaches did you think about?
- **Additional context**: Screenshots, mockups, or examples

### Adding New Node Types

We love new integrations! Here's how to add a node:

1. **Use the Node Builder CLI**:
   ```bash
   npx create-workflow-node my-integration
   ```

2. **Follow the generated structure**:
   - Node definition in `src/data/nodeTypes.ts`
   - Configuration component in `src/workflow/nodes/config/MyNodeConfig.tsx`
   - Execution logic in node config or `ExecutionEngine.ts`
   - Unit tests in `src/__tests__/`

3. **Required elements**:
   - Input/output schema definition
   - Configuration UI component
   - Execution logic with error handling
   - Authentication/credentials (if needed)
   - Comprehensive tests (unit + integration)
   - Documentation with examples

4. **See existing nodes for examples**:
   - Simple: `src/workflow/nodes/config/DelayConfig.tsx`
   - API integration: `src/workflow/nodes/config/HttpRequestConfig.tsx`
   - Database: `src/workflow/nodes/config/PostgreSQLConfig.tsx`
   - Trigger: `src/workflow/nodes/config/ScheduleConfig.tsx`

### Contributing to Documentation

Documentation improvements are always welcome!

- **Fix typos/errors**: Small fixes can be PRs directly
- **New guides**: Discuss in an issue first
- **API docs**: Update alongside code changes
- **Examples**: Real-world workflow examples appreciated

**Documentation locations**:
- User guides: `/docs/guides/`
- API reference: `/docs/api/`
- Architecture: `CLAUDE.md`
- Changelog: `CHANGELOG.md`

## Style Guides

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples**:
```
feat(nodes): add Salesforce integration

Implement complete Salesforce CRUD operations with OAuth2
authentication and query builder.

Closes #123
```

```
fix(execution): prevent memory leak in long-running workflows

Added proper cleanup of event listeners and disposed resources
after workflow completion.

Fixes #456
```

### TypeScript Code Style

We use **ESLint** and **Prettier** for consistent code formatting.

**Before committing**:
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run format      # Format with Prettier
npm run typecheck   # Verify types
```

**Key conventions**:
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Line length**: Max 100 characters
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_SNAKE_CASE` for constants
  - Prefix interfaces with `I` when needed (e.g., `IWorkflowNode`)

**TypeScript specific**:
- Always define types explicitly (avoid `any`)
- Use strict mode (`strict: true` in tsconfig.json)
- Prefer interfaces over type aliases for object shapes
- Use generics for reusable components

**Example**:
```typescript
// Good
interface INodeConfig {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

async function executeNode(config: INodeConfig): Promise<NodeOutput> {
  const result = await processNode(config);
  return result;
}

// Avoid
function executeNode(config: any) {
  const result = processNode(config);
  return result;
}
```

### React Component Style

**Functional components with TypeScript**:
```typescript
import React, { useState, useEffect } from 'react';

interface MyComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
  children?: React.ReactNode;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onSubmit,
  children
}) => {
  const [state, setState] = useState<string>('');

  useEffect(() => {
    // Effect logic
  }, []);

  return (
    <div className="my-component">
      <h1>{title}</h1>
      {children}
    </div>
  );
};
```

**Component file structure**:
1. Imports (external, then internal)
2. Type/Interface definitions
3. Component definition
4. Styled components (if any)
5. Export

### CSS/Tailwind Style

- Use **Tailwind CSS** utility classes
- Custom styles in `src/styles/` when needed
- Follow design system in `src/styles/design-system.css`
- Responsive design: mobile-first approach
- Dark mode support via CSS variables

## Testing Requirements

All contributions **must include tests**. We maintain high test coverage (>80%).

### Running Tests

```bash
npm run test                # Run all tests (watch mode)
npm run test:coverage       # Generate coverage report
npm run test:integration    # Run integration tests
npm run test:e2e            # Run E2E tests with Playwright
npm run test:ui             # Open Vitest UI
```

### Test Types

1. **Unit Tests** (Vitest):
   - Test individual functions and components
   - Location: `src/__tests__/` or alongside source files
   - File naming: `*.test.ts` or `*.test.tsx`

   ```typescript
   import { describe, it, expect } from 'vitest';
   import { myFunction } from './myFunction';

   describe('myFunction', () => {
     it('should return expected result', () => {
       const result = myFunction('input');
       expect(result).toBe('expected');
     });
   });
   ```

2. **Integration Tests** (Vitest):
   - Test component interactions and API endpoints
   - Location: `src/__tests__/`
   - File naming: `*.integration.test.ts`

3. **E2E Tests** (Playwright):
   - Test complete user workflows
   - Location: `src/__tests__/`
   - File naming: `*.e2e.test.ts`

### Test Coverage Requirements

- **Minimum coverage**: 80% overall
- **New features**: 90%+ coverage required
- **Bug fixes**: Add regression tests
- **Critical paths**: 100% coverage (authentication, execution engine, data storage)

### Writing Good Tests

**Do**:
- Test behavior, not implementation
- Use descriptive test names
- One assertion per test when possible
- Test edge cases and error conditions
- Mock external dependencies
- Clean up resources (timers, listeners, etc.)

**Don't**:
- Test private methods directly
- Use brittle selectors in E2E tests
- Share state between tests
- Test framework internals
- Skip flaky tests (fix them instead)

## Pull Request Process

### Before Submitting

**Checklist**:
- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] TypeScript compilation successful
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention
- [ ] No console.log() or debug code
- [ ] Changes work on multiple browsers
- [ ] Responsive design verified

**Run these commands**:
```bash
npm run typecheck       # Check TypeScript
npm run lint            # Check linting
npm run test:coverage   # Run tests
npm run build           # Test production build
```

### Creating the Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub** with:
   - **Clear title**: Following commit message convention
   - **Description**: What changes and why
   - **Screenshots**: For UI changes
   - **Testing**: How to test the changes
   - **Related issues**: `Closes #123` or `Fixes #456`

**PR Template**:
```markdown
## Description
[Clear description of changes]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
[Describe the tests you ran]

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Related Issues
Closes #[issue number]
```

### Review Process

1. **Automated checks**: CI/CD pipeline runs tests and linting
2. **Code review**: At least one maintainer reviews
3. **Feedback**: Address review comments
4. **Approval**: Once approved, maintainers will merge

**Review timeline**:
- Initial review: Within 2-3 business days
- Follow-up reviews: Within 1-2 business days
- Complex PRs may take longer

### After Merge

- Delete your feature branch
- Update your local main branch
- Close related issues (if not auto-closed)

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Requests**: Code contributions
- **Email**: security@example.com (for security issues only)

### Getting Help

See [SUPPORT.md](SUPPORT.md) for:
- Documentation resources
- FAQ
- Community support options
- Commercial support

### Recognition

Contributors are recognized in:
- [Contributors page](https://github.com/OWNER/workflow/graphs/contributors)
- Release notes (for significant contributions)
- Special mentions in the README

## Development Tips

### Useful Commands

```bash
# Development
npm run dev              # Start dev servers
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Database
npm run migrate:dev      # Create and apply migration
npm run studio           # Open Prisma Studio
npm run seed             # Seed database

# Quality
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run typecheck        # Check types

# Testing
npm run test             # Run tests
npm run test:ui          # Visual test UI
npm run test:coverage    # Coverage report
npm run test:e2e         # E2E tests

# Build
npm run build            # Production build
npm run preview          # Preview build
```

### Debugging

**Frontend**:
- React DevTools browser extension
- Redux DevTools for state inspection
- Vite's HMR for instant updates
- Browser developer tools

**Backend**:
- VS Code debugger configuration provided
- Node.js inspector: `node --inspect`
- Detailed logging with structured logger
- Prisma Studio for database inspection

**Workflow Execution**:
- Built-in debugger with breakpoints
- Data pinning for testing nodes
- Execution viewer with step-by-step playback
- Performance profiler

### Performance Considerations

- Use React.memo for expensive components
- Implement proper code splitting
- Optimize database queries (use Prisma efficiently)
- Monitor bundle size (aim for <500KB initial)
- Use virtualization for long lists (react-window)
- Lazy load heavy components
- Optimize images and assets

### Security Considerations

- Never commit secrets or credentials
- Validate all user inputs
- Sanitize data before rendering
- Use parameterized queries (Prisma handles this)
- Implement CSRF protection
- Follow OWASP guidelines
- See [SECURITY.md](SECURITY.md) for more details

## Questions?

Don't hesitate to ask! We're here to help:
- Open a [GitHub Discussion](https://github.com/OWNER/workflow/discussions)
- Check [SUPPORT.md](SUPPORT.md) for resources
- Read the [documentation](./docs/)
- Look at existing [issues](https://github.com/OWNER/workflow/issues)

Thank you for contributing! 🎉
