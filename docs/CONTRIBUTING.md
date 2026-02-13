# Contributing Guide

Thank you for your interest in contributing to the Workflow Automation Platform! This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Adding New Nodes](#adding-new-nodes)
7. [Testing](#testing)
8. [Code Style](#code-style)
9. [Pull Request Process](#pull-request-process)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Standards

**✅ Encouraged:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other members

**❌ Unacceptable:**
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

---

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Git**: For version control
- **Docker**: For running services (PostgreSQL, Redis)
- **Code Editor**: VS Code recommended

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/workflow-automation.git
   cd workflow-automation
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/workflow-automation/workflow-automation.git
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000
API_PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-dev-secret
```

### 3. Start Development Services

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This starts PostgreSQL, Redis, and other required services.

### 4. Run Database Migrations

```bash
npm run migrate:dev
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- GraphQL: http://localhost:3001/graphql

---

## Project Structure

```
workflow-automation/
├── src/
│   ├── components/           # React components
│   │   ├── ModernWorkflowEditor.tsx
│   │   ├── NodeConfigPanel.tsx
│   │   └── ...
│   ├── workflow/
│   │   ├── nodes/
│   │   │   └── config/       # Node configuration components
│   │   ├── nodeConfigRegistry.ts
│   │   └── NodeConfigPanel.tsx
│   ├── backend/
│   │   ├── api/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── middleware/   # Express middleware
│   │   │   └── server.ts
│   │   ├── auth/             # Authentication
│   │   ├── queue/            # Job queue
│   │   └── security/         # Security utilities
│   ├── store/                # Zustand state management
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   └── __tests__/            # Tests
├── docs/                     # Documentation
├── public/                   # Static assets
├── prisma/                   # Database schema
├── scripts/                  # Build and deployment scripts
└── k8s/                      # Kubernetes manifests
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch Naming:**
- `feature/`: New features
- `fix/`: Bug fixes
- `docs/`: Documentation changes
- `refactor/`: Code refactoring
- `test/`: Test improvements
- `chore/`: Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow existing patterns
- Add tests for new features
- Update documentation

### 3. Commit Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add AWS Lambda node configuration"
git commit -m "fix: resolve race condition in execution engine"
git commit -m "docs: update API documentation"
git commit -m "test: add integration tests for MongoDB node"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

### 4. Keep Fork Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 5. Push Changes

```bash
git push origin feature/your-feature-name
```

---

## Adding New Nodes

### 1. Create Node Type Definition

Edit `src/data/nodeTypes.ts`:

```typescript
myNewNode: {
  type: 'myNewNode',
  label: 'My New Service',
  icon: 'Cloud',
  color: 'bg-purple-600',
  category: 'integration',
  inputs: 1,
  outputs: 1,
  description: 'Integration with My Service'
}
```

### 2. Create Configuration Component

Create `src/workflow/nodes/config/MyNewNodeConfig.tsx`:

```typescript
import React, { useState } from 'react';

interface MyNewNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const MyNewNodeConfig: React.FC<MyNewNodeConfigProps> = ({
  config,
  onChange
}) => {
  const [operation, setOperation] = useState(
    config.operation as string || 'defaultOperation'
  );

  const handleChange = (updates: Record<string, unknown>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            handleChange({ operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="operation1">Operation 1</option>
          <option value="operation2">Operation 2</option>
        </select>
      </div>

      {/* Add more configuration fields */}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">
          Authentication
        </p>
        <p className="text-xs text-blue-700">
          Configure API credentials in Credentials Manager.
        </p>
      </div>
    </div>
  );
};
```

### 3. Register Configuration

Edit `src/workflow/nodeConfigRegistry.ts`:

```typescript
// Import
import { MyNewNodeConfig } from './nodes/config/MyNewNodeConfig';

// Register
const registry: Record<string, React.ComponentType<...>> = {
  // ... existing nodes
  myNewNode: MyNewNodeConfig,
};
```

### 4. Implement Execution Logic

Edit `src/components/ExecutionEngine.ts`:

```typescript
case 'myNewNode':
  return await this.executeMyNewNode(node, inputData);

private async executeMyNewNode(
  node: WorkflowNode,
  inputData: unknown
): Promise<ExecutionResult> {
  const { operation, ...params } = node.data.config || {};

  try {
    // Implement node logic
    const result = await callMyServiceAPI(operation, params, inputData);

    return {
      success: true,
      data: result,
      outputData: { main: [result] }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      outputData: { error: [{ error: error.message }] }
    };
  }
}
```

### 5. Add Tests

Create `src/__tests__/myNewNode.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { WorkflowExecutor } from '../components/ExecutionEngine';

describe('MyNewNode', () => {
  it('should execute successfully', async () => {
    const executor = new WorkflowExecutor();
    const result = await executor.executeMyNewNode(
      { /* node config */ },
      { /* input data */ }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    // Test error scenarios
  });
});
```

### 6. Add Documentation

Add node documentation to `docs/NODE_REFERENCE.md`.

---

## Testing

### Run Tests

```bash
# All tests
npm run test

# Specific file
npm run test -- src/__tests__/myNode.test.ts

# Watch mode
npm run test -- --watch

# Coverage
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Writing Tests

**Unit Tests:**
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyFunction', () => {
  it('should return expected result', () => {
    const result = myFunction(input);
    expect(result).toEqual(expected);
  });

  it('should handle edge cases', () => {
    expect(myFunction(null)).toBeNull();
    expect(myFunction('')).toEqual('');
  });
});
```

**Integration Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../backend/api/app';

describe('API Endpoints', () => {
  it('GET /api/workflows', async () => {
    const response = await request(app)
      .get('/api/workflows')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('workflows');
  });
});
```

---

## Code Style

### TypeScript

**✅ Good:**
```typescript
// Explicit types
interface UserData {
  id: string;
  name: string;
  email: string;
}

// Async/await
async function fetchUser(id: string): Promise<UserData> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// Error handling
try {
  const user = await fetchUser('123');
  processUser(user);
} catch (error) {
  handleError(error);
}
```

**❌ Avoid:**
```typescript
// Any types
function fetchUser(id: any): any {
  // ...
}

// Promises without await
function fetchUser(id: string) {
  return fetch(`/api/users/${id}`)
    .then(r => r.json())
    .then(processUser)
    .catch(handleError);
}
```

### React Components

**✅ Good:**
```typescript
interface Props {
  data: DataType;
  onUpdate: (data: DataType) => void;
}

export const MyComponent: React.FC<Props> = ({ data, onUpdate }) => {
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
};
```

### Naming Conventions

- **Components**: PascalCase (`MyComponent.tsx`)
- **Hooks**: camelCase with `use` prefix (`useWorkflow.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`WorkflowNode`, `ExecutionResult`)

### Formatting

We use Prettier for code formatting:

```bash
npm run format
```

Configuration (`.prettierrc`):
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Linting

We use ESLint for code quality:

```bash
npm run lint
npm run lint:fix
```

---

## Pull Request Process

### 1. Create Pull Request

1. Push your branch to your fork
2. Go to GitHub and create a Pull Request
3. Fill out the PR template:
   - Description of changes
   - Related issue number
   - Testing performed
   - Screenshots (for UI changes)

### 2. PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #123

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots
(if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
```

### 3. Review Process

1. **Automated Checks**:
   - CI/CD pipeline runs
   - Tests must pass
   - Linting must pass
   - Build must succeed

2. **Code Review**:
   - At least one maintainer approval required
   - Address feedback promptly
   - Make requested changes

3. **Merge**:
   - Squash and merge (default)
   - Delete branch after merge

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Changelog

Update `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [1.2.0] - 2025-01-18

### Added
- AWS Lambda node configuration
- Google Cloud Pub/Sub integration

### Changed
- Improved execution engine performance

### Fixed
- Race condition in workflow execution
```

---

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Discord**: Real-time chat
- **Twitter**: Updates and announcements

### Getting Help

- Check existing issues and discussions
- Read documentation thoroughly
- Ask specific, detailed questions
- Provide minimal reproducible examples

---

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md`
- Release notes
- GitHub contributors page

Thank you for contributing! 🎉

---

**Last Updated:** 2025-01-18
**Version:** 2.0.0
