# Execution Module

This module provides advanced execution capabilities for workflows including partial execution, data pinning, and debugging.

## Overview

The execution module consists of three main services:

1. **PartialExecutor** - Execute workflows from any specific node
2. **DataPinningService** - Pin test data to nodes for repeated testing
3. **DebugManager** - Debug workflow execution with breakpoints and step-through

## Quick Start

```typescript
import { PartialExecutor } from './PartialExecutor';
import { dataPinningService } from './DataPinning';
import { debugManager } from './DebugManager';

// Execute from specific node
const executor = new PartialExecutor(nodes, edges);
const result = await executor.executeFromNode({
  startNodeId: 'transform-node',
  testData: { user: { id: 1, name: 'John' } }
});

// Pin data to node
dataPinningService.pinData('transform-node', { data: 'test' });

// Debug with breakpoints
const session = debugManager.createSession(nodes, edges);
debugManager.addBreakpoint(session.id, 'validate-node');
```

## Architecture

```
execution/
├── PartialExecutor.ts      # Partial execution engine
├── DataPinning.ts          # Data pinning service
├── DebugManager.ts         # Debug session management
├── ExecutionCore.ts        # Core execution logic (existing)
├── ExecutionValidator.ts   # Validation logic (existing)
└── ExecutionQueue.ts       # Queue management (existing)
```

## Features

### PartialExecutor

- Execute from any node in the workflow
- Build execution subgraph automatically
- Inject test data at start node
- Validate execution before running
- Track execution path
- Handle missing inputs gracefully
- Stop at specified node
- Timeout protection

### DataPinningService

- Pin test data to nodes
- Generate sample data for node types
- Schema inference from data
- Export/import pinned data
- Data validation and size limits
- Circular reference detection
- Source tracking (manual, execution, import)
- Statistics and analytics

### DebugManager

- Create debug sessions
- Add/remove/toggle breakpoints
- Conditional breakpoints with expression evaluation
- Pause/continue/step execution
- Step over, into, out operations
- Variable inspection per node
- Execution stack tracking
- Event system for debug events
- Session state export

## Usage Examples

### Example 1: Test Node with Pinned Data

```typescript
// Pin test data
dataPinningService.pinData('transform-user', {
  firstName: 'John',
  lastName: 'Doe'
});

// Execute from that node
const executor = new PartialExecutor(nodes, edges);
const result = await executor.executeFromNode({
  startNodeId: 'transform-user',
  testData: dataPinningService.getPinnedData('transform-user')?.data
});

console.log('Result:', result.results.get('transform-user'));
```

### Example 2: Debug with Breakpoints

```typescript
const session = debugManager.createSession(nodes, edges);

// Add conditional breakpoint
debugManager.addBreakpoint(
  session.id,
  'validate-data',
  'errorCount > 0'
);

// Execute with debugging
await executor.executeFromNode(
  { startNodeId: 'start', testData: {} },
  undefined,
  (nodeId, result) => {
    if (debugManager.shouldPauseAtNode(session.id, nodeId, result.data)) {
      debugManager.pause(session.id, nodeId, result.data);

      // Inspect variables
      const vars = debugManager.getVariables(session.id, nodeId);
      console.log('Variables at breakpoint:', vars);

      // Step over
      debugManager.stepOver(session.id);
    }
  }
);
```

### Example 3: Generate and Test

```typescript
// Generate sample data for node type
const sampleData = dataPinningService.generateSampleData('http-request');

// Pin it
dataPinningService.pinData('api-call', sampleData, 'manual', 'Test scenario 1');

// Execute multiple times with same data
for (let i = 0; i < 5; i++) {
  const result = await executor.executeFromNode({
    startNodeId: 'api-call',
    testData: sampleData
  });

  console.log(`Run ${i + 1}:`, result.success);
}
```

## API Reference

### PartialExecutor

```typescript
constructor(nodes: WorkflowNode[], edges: WorkflowEdge[])

async executeFromNode(options: PartialExecutionOptions): Promise<PartialExecutionResult>
buildExecutionSubgraph(startNodeId: string): ExecutionSubgraph
validateSubgraph(subgraph: ExecutionSubgraph, testData?: SafeObject): ValidationResult
getExecutionMetrics(): ExecutionMetrics
stop(): void
isRunning(): boolean
```

### DataPinningService

```typescript
constructor(options?: DataPinningOptions)

pinData(nodeId: string, data: SafeObject, source?: 'manual' | 'execution' | 'import', description?: string): PinnedData
unpinData(nodeId: string): boolean
getPinnedData(nodeId: string): PinnedData | undefined
hasPinnedData(nodeId: string): boolean
updatePinnedData(nodeId: string, data: SafeObject, description?: string): PinnedData
clearAll(): void
exportPinnedData(): Record<string, PinnedData>
importPinnedData(data: Record<string, PinnedData>): number
generateSampleData(nodeType: string): SafeObject
pinFromExecution(nodeId: string, executionResult: SafeObject, description?: string): PinnedData
getStats(): DataPinningStats
```

### DebugManager

```typescript
constructor()

createSession(nodes: WorkflowNode[], edges: WorkflowEdge[]): DebugSession
getSession(sessionId: string): DebugSession | undefined
deleteSession(sessionId: string): boolean
addBreakpoint(sessionId: string, nodeId: string, condition?: string): Breakpoint
removeBreakpoint(sessionId: string, nodeId: string): boolean
toggleBreakpoint(sessionId: string, nodeId: string): boolean
shouldPauseAtNode(sessionId: string, nodeId: string, variables?: SafeObject): boolean
pause(sessionId: string, nodeId: string, variables?: SafeObject): void
continue(sessionId: string): void
stepOver(sessionId: string): void
stepInto(sessionId: string): void
stepOut(sessionId: string): void
stop(sessionId: string): void
getVariables(sessionId: string, nodeId?: string): SafeObject | Map<string, SafeObject>
setVariable(sessionId: string, nodeId: string, key: string, value: unknown): void
getExecutionStack(sessionId: string): string[]
pushToStack(sessionId: string, nodeId: string): void
popFromStack(sessionId: string): string | undefined
onEvent(callback: DebugEventCallback): () => void
getStats(sessionId: string): DebugStats
clearAllBreakpoints(sessionId: string): void
exportSession(sessionId: string): Record<string, unknown> | null
```

## Types

### PartialExecutionOptions

```typescript
interface PartialExecutionOptions {
  startNodeId: string;
  testData?: SafeObject;
  stopAtNodeId?: string;
  skipPinnedNodes?: boolean;
  validateBeforeExecution?: boolean;
  maxExecutionTime?: number;
}
```

### PinnedData

```typescript
interface PinnedData {
  nodeId: string;
  data: SafeObject;
  timestamp: string;
  source: 'manual' | 'execution' | 'import';
  description?: string;
  schema?: PinnedDataSchema;
}
```

### DebugSession

```typescript
interface DebugSession {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'stopped';
  currentNode: string | null;
  executionStack: string[];
  variables: Map<string, SafeObject>;
  breakpoints: Map<string, Breakpoint>;
  stepMode: 'over' | 'into' | 'out' | null;
  startTime: number;
}
```

## Performance

- **Partial Execution**: O(V + E) subgraph building, O(N) execution
- **Data Pinning**: O(1) pin/unpin operations, O(D) schema inference
- **Debug Manager**: O(1) breakpoint checks, O(1) variable access

## Testing

Run tests:
```bash
npm test -- src/__tests__/partialExecution.test.ts
npm test -- src/__tests__/dataPinning.test.ts
npm test -- src/__tests__/debugManager.test.ts
npm test -- src/__tests__/partialExecution.integration.test.ts
```

## Documentation

- [Partial Execution Guide](../../docs/PARTIAL_EXECUTION_GUIDE.md)
- [Implementation Report](../../AGENT_14_PARTIAL_EXECUTION_DEBUG_REPORT.md)

## Related Components

UI components for these features:
- `NodeTestData.tsx` - Test data editor dialog
- `DataPinningPanel.tsx` - Pinned data management panel
- `DebugControls.tsx` - Debug toolbar with controls

## Contributing

When adding new features:

1. Update relevant service
2. Add comprehensive tests
3. Update type definitions
4. Document in guide
5. Add usage examples

## License

Part of the Workflow Automation Platform project.
