# Contributing to WorkflowBuilder Pro

Thank you for your interest in contributing to WorkflowBuilder Pro! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project follows a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/workflowbuilder-pro.git
   cd workflowbuilder-pro
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-org/workflowbuilder-pro.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account (for database features)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run E2E tests
npm run lint         # Lint code
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking
```

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/org/workflowbuilder-pro/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, browser, Node version)

### Suggesting Features

1. Check [existing feature requests](https://github.com/org/workflowbuilder-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach
   - Any relevant examples or mockups

### Pull Requests

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our [coding guidelines](#coding-guidelines)

3. **Write tests** for your changes

4. **Update documentation** if needed

5. **Commit your changes** using [conventional commits](#commit-messages)

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type - use proper typing
- Use interfaces for object shapes
- Export types that might be reused

```typescript
// Good
interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

function getUser(id: string): Promise<User> {
  // ...
}

// Bad
function getUser(id: any): Promise<any> {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper prop types

```tsx
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// Bad
export function Button(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### File Organization

```
src/
├── components/       # React components
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── types/           # TypeScript types
├── store/           # State management (Zustand)
├── backend/         # Backend services
│   ├── auth/        # Authentication
│   ├── database/    # Database services
│   └── security/    # Security utilities
└── tests/           # Test files
```

### Naming Conventions

- **Components**: PascalCase (`Button.tsx`, `WorkflowEditor.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`, `useWorkflow.ts`)
- **Utils**: camelCase (`formatDate.ts`, `validateEmail.ts`)
- **Types**: PascalCase (`User.ts`, `Workflow.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_URL`, `MAX_RETRIES`)

### Code Style

We use Prettier for code formatting. Run `npm run format` before committing.

Key points:
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- 100 character line length
- Trailing commas in ES5

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples

```
feat(auth): add OAuth2 support for GitHub

Implement GitHub OAuth2 authentication flow with proper
error handling and token refresh.

Closes #123
```

```
fix(workflow): resolve execution race condition

Fix race condition when multiple nodes complete simultaneously.
Added proper locking mechanism.

Fixes #456
```

```
docs(readme): update installation instructions

Add Supabase setup steps and clarify environment variables.
```

## Pull Request Process

1. **Update the README** if you've added features or changed behavior
2. **Add tests** for your changes
3. **Ensure all tests pass**: `npm run test`
4. **Run linting**: `npm run lint`
5. **Run type checking**: `npm run typecheck`
6. **Update CHANGELOG.md** with your changes
7. **Request review** from maintainers

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added and passing
- [ ] No console errors or warnings
- [ ] Tested in multiple browsers
- [ ] Mobile responsive (if UI changes)
- [ ] Accessibility considered (WCAG 2.1)

## Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

Write tests for:
- All new features
- Bug fixes
- Utility functions
- Complex logic

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run in UI mode
npx playwright test --ui
```

Test critical user flows:
- Workflow creation
- Node configuration
- Execution
- Authentication

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Explain complex algorithms
- Document edge cases

```typescript
/**
 * Executes a workflow with the given configuration
 * @param workflow - The workflow to execute
 * @param options - Execution options
 * @returns Promise resolving to execution results
 * @throws {ExecutionError} If workflow execution fails
 */
async function executeWorkflow(
  workflow: Workflow,
  options: ExecutionOptions
): Promise<ExecutionResult> {
  // ...
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing installation steps
- Modifying configuration
- Adding dependencies

## Need Help?

- 📖 Read the [documentation](./README.md)
- 💬 Join our [Discord community](https://discord.gg/workflow)
- 🐛 Check [existing issues](https://github.com/org/workflowbuilder-pro/issues)
- 📧 Email: support@workflowbuilder.app

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to WorkflowBuilder Pro! 🚀
