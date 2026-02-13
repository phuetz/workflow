# Code Quality Checklist ✅

**Quick reference** for maintaining 95/100 quality score.

---

## 🎯 Daily Quality Gates

Before committing code, ensure:

- [ ] `npm run typecheck` → ✅ 0 errors
- [ ] `npm run lint` → ✅ 0 errors, <50 warnings
- [ ] Code compiles without errors
- [ ] No `console.log` in production code (use logger)
- [ ] New functions have proper types (no `any`)
- [ ] Files under 1,000 lines (split if longer)
- [ ] Functions under 50 lines (extract if longer)
- [ ] Complexity under 20 (refactor if higher)

---

## 📋 Code Review Checklist

### Type Safety
- [ ] No `any` types (use `unknown`, `Record<string, unknown>`, or proper types)
- [ ] All function parameters typed
- [ ] All function return types explicit or inferred
- [ ] No `@ts-ignore` comments (use `@ts-expect-error` with explanation)
- [ ] Proper null/undefined handling

### Code Organization
- [ ] Single responsibility per function/component
- [ ] Clear, descriptive names
- [ ] Functions under 50 lines
- [ ] Files under 1,000 lines
- [ ] Proper imports (no circular dependencies)
- [ ] No dead code (unused variables/functions)

### Error Handling
- [ ] All async operations have try/catch
- [ ] Errors logged with proper context
- [ ] User-friendly error messages
- [ ] Proper error types (not generic Error)

### React Components
- [ ] Props properly typed (interface or type)
- [ ] Hooks follow rules (rules-of-hooks)
- [ ] Dependencies properly listed (exhaustive-deps)
- [ ] No inline object/function creation in JSX
- [ ] Proper key props in lists
- [ ] Memoization where appropriate

### Performance
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized
- [ ] Heavy computations memoized
- [ ] Debounced user inputs
- [ ] Lazy loading for large components

---

## 🔧 Common Fixes

### Fix: Remove unused variable

```typescript
// ❌ Before
const [value, setValue] = useState(0);

// ✅ After
const [_value, setValue] = useState(0);
// or remove if truly unused
```

### Fix: Replace any type

```typescript
// ❌ Before
const [data, setData] = useState<any>(null);

// ✅ After - Option 1: Unknown
const [data, setData] = useState<unknown>(null);

// ✅ After - Option 2: Proper type
interface UserData {
  id: string;
  name: string;
}
const [data, setData] = useState<UserData | null>(null);

// ✅ After - Option 3: Record
const [data, setData] = useState<Record<string, unknown> | null>(null);
```

### Fix: Express middleware types

```typescript
// ❌ Before
const middleware = (req: any, res: any, next: any) => {
  // ...
};

// ✅ After
import { Request, Response, NextFunction } from 'express';

const middleware = (req: Request, res: Response, next: NextFunction) => {
  // ...
};
```

### Fix: Reduce complexity

```typescript
// ❌ Before - Complexity 25
function processData(data: Data) {
  if (condition1) {
    if (condition2) {
      if (condition3) {
        // deeply nested logic
      }
    }
  }
  // ... more conditions
}

// ✅ After - Extract functions
function processData(data: Data) {
  if (!isValid(data)) return;

  const processed = transformData(data);
  return applyBusinessLogic(processed);
}

function isValid(data: Data): boolean { /* ... */ }
function transformData(data: Data): ProcessedData { /* ... */ }
function applyBusinessLogic(data: ProcessedData): Result { /* ... */ }
```

### Fix: Split large files

```typescript
// ❌ Before - 1,500 lines in one file
// MyComponent.tsx
export const MyComponent = () => {
  // 1,500 lines of code
};

// ✅ After - Split into modules
// MyComponent.tsx (300 lines)
export { MyComponent } from './MyComponent';

// MyComponent/index.tsx
export { MyComponent } from './MyComponent';

// MyComponent/MyComponent.tsx (300 lines)
import { useMyHook } from './hooks/useMyHook';
import { MySubComponent } from './components/MySubComponent';
export const MyComponent = () => { /* ... */ };

// MyComponent/hooks/useMyHook.ts (200 lines)
export const useMyHook = () => { /* ... */ };

// MyComponent/components/MySubComponent.tsx (300 lines)
export const MySubComponent = () => { /* ... */ };
```

---

## 🚀 Best Practices

### TypeScript

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return api.get<User>(`/users/${id}`);
}

// ✅ Good - Generic types
function processItems<T>(items: T[]): T[] {
  return items.filter(item => item !== null);
}

// ✅ Good - Union types
type Status = 'pending' | 'active' | 'completed';

function setStatus(status: Status): void {
  // Type-safe status values
}
```

### React

```typescript
// ✅ Good - Typed props
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary'
}) => {
  return (
    <button onClick={onClick} className={variant}>
      {label}
    </button>
  );
};

// ✅ Good - Memoized component
export const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    return expensiveOperation(data);
  }, [data]);

  return <div>{processedData}</div>;
});
```

### Error Handling

```typescript
// ✅ Good - Specific error types
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Good - Proper error handling
async function saveUser(user: User): Promise<void> {
  try {
    await api.post('/users', user);
    logger.info('User saved', { userId: user.id });
  } catch (error) {
    logger.error('Failed to save user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.id
    });
    throw new Error('Failed to save user');
  }
}
```

---

## 📊 Quality Metrics

**Current Status:**
- ✅ TypeScript Errors: 0
- ✅ ESLint Errors: 0
- ⚠️ ESLint Warnings: 16
- ⚠️ Any Types: 2,495
- ⚠️ Large Files: 17

**Targets:**
- TypeScript Errors: 0
- ESLint Errors: 0
- ESLint Warnings: <10
- Any Types: <2,000
- Large Files: <10

---

## 🎯 Quality Score Calculation

```
Base Score: 100

Deductions:
- TypeScript errors: -2 per error (max -20)
- ESLint errors: -1 per error (max -10)
- ESLint warnings: -0.1 per warning (max -5)
- Any types > 2000: -3
- Any types > 3000: -5
- Large files > 10: -2

Current: 95/100
Target: 98/100
```

---

## 📝 References

- [CODE_QUALITY_FINAL_REPORT.md](./CODE_QUALITY_FINAL_REPORT.md) - Detailed metrics
- [QUALITY_VALIDATION_COMMANDS.md](./QUALITY_VALIDATION_COMMANDS.md) - Validation commands
- [POLISH_FINAL_SUMMARY.md](./POLISH_FINAL_SUMMARY.md) - Executive summary
- [CLAUDE.md](./CLAUDE.md) - Development guidelines

---

**Maintained by:** Development Team
**Last Updated:** 2025-10-24
**Quality Score:** 95/100
