# Documentation Quick Start Guide

**For Developers: How to Document Code Properly**

---

## 🎯 Quick Reference

### Must Document
✅ **All exported functions**
✅ **All classes**
✅ **All public interfaces**
✅ **All complex types**
✅ **All enums**
✅ **All API endpoints**

### Nice to Document
✓ Private functions (if complex)
✓ Internal utilities
✓ Test helpers
✓ Constants

---

## 📋 5-Minute JSDoc Guide

### 1. Function Documentation

```typescript
/**
 * Executes a workflow and returns the execution result.
 *
 * This function handles the complete workflow execution lifecycle including
 * node dependency resolution, parallel execution, error handling, and
 * result aggregation.
 *
 * @param workflowId - Unique identifier of the workflow to execute
 * @param input - Input data for the workflow (optional)
 * @param options - Execution options (optional)
 * @returns Promise resolving to execution result with node outputs
 *
 * @throws {WorkflowNotFoundError} If workflow doesn't exist
 * @throws {CircularDependencyError} If workflow has cycles
 * @throws {ExecutionError} If execution fails
 *
 * @example
 * ```typescript
 * const result = await executeWorkflow('wf_123', {
 *   data: 'input'
 * });
 * console.log(result.outputs);
 * ```
 *
 * @see {@link WorkflowExecutor} for low-level execution
 * @since v2.1.0
 */
export async function executeWorkflow(
  workflowId: string,
  input?: Record<string, unknown>,
  options?: ExecutionOptions
): Promise<ExecutionResult> {
  // Implementation
}
```

### 2. Class Documentation

```typescript
/**
 * Manages workflow execution with advanced features.
 *
 * The WorkflowExecutor class provides:
 * - Topological sort for dependency resolution
 * - Parallel execution of independent nodes
 * - Error propagation through error branches
 * - Execution state tracking and resumption
 *
 * @example
 * ```typescript
 * const executor = new WorkflowExecutor({
 *   maxParallel: 5,
 *   timeout: 300000
 * });
 *
 * const result = await executor.execute(workflow, input);
 * ```
 *
 * @since v2.0.0
 */
export class WorkflowExecutor {
  /**
   * Creates a new WorkflowExecutor instance.
   *
   * @param config - Executor configuration
   * @throws {ConfigurationError} If config is invalid
   */
  constructor(private config: ExecutorConfig) {
    this.validateConfig(config);
  }

  /**
   * Executes a workflow.
   *
   * @param workflow - Workflow definition
   * @param input - Input data
   * @returns Execution result
   */
  public async execute(
    workflow: Workflow,
    input: unknown
  ): Promise<ExecutionResult> {
    // Implementation
  }
}
```

### 3. Interface Documentation

```typescript
/**
 * Represents a node in a workflow.
 *
 * WorkflowNode is the fundamental building block of workflows. Each node
 * has a type (e.g., 'http', 'email', 'transform'), configuration specific
 * to that type, and connections to other nodes via edges.
 *
 * @example
 * ```typescript
 * const node: WorkflowNode = {
 *   id: 'node_1',
 *   type: 'http',
 *   name: 'Fetch User Data',
 *   position: { x: 100, y: 200 },
 *   config: {
 *     url: 'https://api.example.com/users',
 *     method: 'GET'
 *   }
 * };
 * ```
 *
 * @since v1.0.0
 */
export interface WorkflowNode {
  /**
   * Unique identifier for this node.
   * Must be unique within the workflow.
   */
  id: string;

  /**
   * Type of node determining its behavior.
   * Examples: 'http', 'email', 'slack', 'transform'
   */
  type: NodeType;

  /**
   * Human-readable name for the node.
   * Displayed in the UI and logs.
   */
  name: string;

  /**
   * Position on the canvas (x, y coordinates).
   */
  position: { x: number; y: number };

  /**
   * Node-specific configuration.
   * Structure depends on node type.
   */
  config: Record<string, unknown>;
}
```

### 4. Type Documentation

```typescript
/**
 * Status of a workflow execution.
 *
 * Lifecycle:
 * 1. pending - Execution queued but not started
 * 2. running - Currently executing nodes
 * 3. completed - All nodes executed successfully
 * 4. failed - One or more nodes failed
 * 5. cancelled - User cancelled execution
 *
 * @example
 * ```typescript
 * let status: ExecutionStatus = 'pending';
 * status = 'running'; // Started
 * status = 'completed'; // Finished successfully
 * ```
 *
 * @since v1.0.0
 */
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

### 5. Enum Documentation

```typescript
/**
 * User roles with different permission levels.
 *
 * Permission hierarchy (least to most):
 * VIEWER < EDITOR < ADMIN < OWNER
 *
 * @example
 * ```typescript
 * const role = UserRole.ADMIN;
 *
 * if (role === UserRole.ADMIN || role === UserRole.OWNER) {
 *   console.log('User has admin privileges');
 * }
 * ```
 *
 * @since v2.0.0
 */
export enum UserRole {
  /**
   * Read-only access to workflows.
   * Cannot create, edit, or execute workflows.
   */
  VIEWER = 'viewer',

  /**
   * Can create and edit workflows.
   * Cannot manage users or settings.
   */
  EDITOR = 'editor',

  /**
   * Full access except ownership transfer.
   * Can manage users and configure settings.
   */
  ADMIN = 'admin',

  /**
   * Complete control over the workspace.
   * Can transfer ownership and delete workspace.
   */
  OWNER = 'owner'
}
```

---

## 🚀 Quick Actions

### Add JSDoc to Existing Function

**Before**:
```typescript
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**After** (30 seconds):
```typescript
/**
 * Calculates the total price of all items.
 *
 * @param items - Array of items to sum
 * @returns Total price
 *
 * @example
 * ```typescript
 * const total = calculateTotal([
 *   { price: 10 },
 *   { price: 20 }
 * ]); // 30
 * ```
 */
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Document Magic Numbers

**Before**:
```typescript
if (statusCode >= 200 && statusCode < 300) {
  return 'success';
}
if (timeout > 30000) {
  throw new Error('Timeout too long');
}
```

**After**:
```typescript
/**
 * HTTP success status code range.
 * Status codes 200-299 indicate successful requests.
 */
const HTTP_SUCCESS_MIN = 200;
const HTTP_SUCCESS_MAX = 300;

/**
 * Maximum allowed timeout in milliseconds.
 * Prevents extremely long-running requests (30 seconds).
 */
const MAX_TIMEOUT_MS = 30000;

if (statusCode >= HTTP_SUCCESS_MIN && statusCode < HTTP_SUCCESS_MAX) {
  return 'success';
}
if (timeout > MAX_TIMEOUT_MS) {
  throw new Error('Timeout too long');
}
```

---

## 🎨 VSCode Snippets

Add to `.vscode/jsdoc.code-snippets`:

```json
{
  "JSDoc Function": {
    "prefix": "jsd-func",
    "body": [
      "/**",
      " * ${1:Description}",
      " *",
      " * @param ${2:param} - ${3:Description}",
      " * @returns ${4:Return description}",
      " *",
      " * @example",
      " * ```typescript",
      " * ${5:Example code}",
      " * ```",
      " */"
    ],
    "description": "JSDoc function documentation"
  },
  "JSDoc Class": {
    "prefix": "jsd-class",
    "body": [
      "/**",
      " * ${1:Description}",
      " *",
      " * @example",
      " * ```typescript",
      " * const instance = new ${2:ClassName}(config);",
      " * ${3:// Usage}",
      " * ```",
      " *",
      " * @since v${4:2.1.0}",
      " */"
    ],
    "description": "JSDoc class documentation"
  },
  "JSDoc Interface": {
    "prefix": "jsd-interface",
    "body": [
      "/**",
      " * ${1:Description}",
      " *",
      " * @example",
      " * ```typescript",
      " * const obj: ${2:InterfaceName} = {",
      " *   ${3:// Properties}",
      " * };",
      " * ```",
      " *",
      " * @since v${4:2.1.0}",
      " */"
    ],
    "description": "JSDoc interface documentation"
  },
  "JSDoc Property": {
    "prefix": "jsd-prop",
    "body": [
      "/**",
      " * ${1:Description}",
      " */"
    ],
    "description": "JSDoc property documentation"
  },
  "JSDoc Const": {
    "prefix": "jsd-const",
    "body": [
      "/**",
      " * ${1:Description}",
      " * ${2:Additional context}",
      " */"
    ],
    "description": "JSDoc constant documentation"
  }
}
```

**Usage**: Type `jsd-func` then press Tab

---

## ⚙️ ESLint Configuration

Add to `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['jsdoc'],
  rules: {
    // Require JSDoc for exports
    'jsdoc/require-jsdoc': ['error', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: false, // Too strict for inline functions
        FunctionExpression: false
      },
      contexts: [
        'ExportNamedDeclaration > VariableDeclaration',
        'TSInterfaceDeclaration',
        'TSTypeAliasDeclaration',
        'TSEnumDeclaration'
      ]
    }],

    // Require descriptions
    'jsdoc/require-description': ['warn', {
      contexts: ['any']
    }],

    // Require param descriptions
    'jsdoc/require-param-description': 'error',

    // Require return descriptions
    'jsdoc/require-returns-description': 'error',

    // Check param names match function
    'jsdoc/check-param-names': 'error',

    // Check types are valid
    'jsdoc/check-types': 'error',

    // Require examples for public APIs
    'jsdoc/require-example': ['warn', {
      contexts: [
        'ExportNamedDeclaration > FunctionDeclaration',
        'ExportNamedDeclaration > ClassDeclaration'
      ],
      exemptedBy: ['private', 'internal']
    }],

    // No multi-line description
    'jsdoc/multiline-blocks': ['error', {
      noSingleLineBlocks: true
    }]
  }
};
```

**Run**: `npm run lint` to check JSDoc compliance

---

## 📊 Measure Progress

### Generate Coverage Report

```bash
# Install TypeDoc
npm install --save-dev typedoc

# Generate docs
npx typedoc --out docs-generated src/

# View coverage
open docs-generated/coverage.html
```

### Check Specific File

```bash
# Run ESLint on one file
npx eslint --plugin jsdoc src/components/ExecutionEngine.ts

# Fix auto-fixable issues
npx eslint --plugin jsdoc --fix src/components/ExecutionEngine.ts
```

### Track Overall Progress

Create `scripts/jsdoc-stats.js`:

```javascript
const fs = require('fs');
const path = require('path');

let total = 0;
let documented = 0;

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let hasJSDoc = false;
  for (const line of lines) {
    if (line.trim().startsWith('/**')) {
      hasJSDoc = true;
      break;
    }
  }

  total++;
  if (hasJSDoc) documented++;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      analyzeFile(filePath);
    }
  }
}

walkDir('src');

const coverage = ((documented / total) * 100).toFixed(1);
console.log(`JSDoc Coverage: ${documented}/${total} files (${coverage}%)`);
```

**Run**: `node scripts/jsdoc-stats.js`

---

## 🎓 Best Practices

### DO ✅

- **Write clear descriptions** - First line should be brief summary
- **Include examples** - Especially for complex functions
- **Document parameters** - Explain what each parameter does
- **Document return values** - Explain what is returned
- **List exceptions** - Document errors that can be thrown
- **Add @since tags** - Track when features were added
- **Use @see links** - Reference related code
- **Document edge cases** - Explain behavior in special cases

### DON'T ❌

- **State the obvious** - `/** Gets user */ getUser()` is useless
- **Copy-paste** - Each function should have unique docs
- **Lie** - Docs must match implementation
- **Over-document** - Private helpers don't need novels
- **Skip examples** - Complex APIs need usage examples
- **Forget updates** - Update docs when code changes

### Example: Bad vs Good

**Bad** ❌:
```typescript
/**
 * Gets user
 */
function getUser(id: string) {
  // ...
}
```

**Good** ✅:
```typescript
/**
 * Retrieves a user by their unique identifier.
 *
 * Fetches user data from the database including profile information,
 * preferences, and role assignments. Returns null if user doesn't exist.
 *
 * @param id - Unique user identifier (UUID format)
 * @returns User object or null if not found
 *
 * @throws {DatabaseError} If database connection fails
 *
 * @example
 * ```typescript
 * const user = await getUser('user_123');
 * if (user) {
 *   console.log(user.email);
 * }
 * ```
 *
 * @see {@link createUser} to create a new user
 * @since v1.0.0
 */
async function getUser(id: string): Promise<User | null> {
  // ...
}
```

---

## 🔧 Tools & Resources

### VSCode Extensions

- **Document This** - Auto-generate JSDoc
- **Better Comments** - Highlight TODO, FIXME, etc.
- **Error Lens** - Show ESLint errors inline

### Online Tools

- **TypeDoc** - Generate HTML docs from JSDoc
- **JSDoc** - Official JSDoc tool
- **ESLint JSDoc Plugin** - Enforce JSDoc rules

### References

- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [JSDoc Official Documentation](https://jsdoc.app/)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

---

## 📞 Need Help?

- Check `AUDIT_DOCUMENTATION_100.md` for comprehensive audit
- See `JSDOC_PRIORITY_LIST.md` for file priorities
- Review existing well-documented files as examples
- Ask in #documentation Slack channel

---

**Remember**: Good documentation is an investment. Spend 2 minutes now, save hours later!

---

**Version**: 1.0
**Last Updated**: 2025-10-23
