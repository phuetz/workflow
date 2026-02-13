# Partial Execution & Debugging Guide

Complete guide to using partial execution, data pinning, and debugging features.

---

## Quick Start

### 1. Execute from Any Node

Execute your workflow starting from any specific node, skipping all upstream nodes:

```typescript
import { PartialExecutor } from '../execution/PartialExecutor';

// Create executor
const executor = new PartialExecutor(nodes, edges);

// Execute from specific node with test data
const result = await executor.executeFromNode({
  startNodeId: 'transform-node',
  testData: {
    user: { id: 1, name: 'John Doe' },
    items: [{ id: 1 }, { id: 2 }]
  }
});

console.log(`✅ Executed ${result.nodesExecuted} nodes`);
console.log(`Path: ${result.executionPath.join(' → ')}`);
```

### 2. Pin Test Data to Nodes

Pin data to nodes for repeated testing without re-execution:

```typescript
import { dataPinningService } from '../execution/DataPinning';

// Pin data manually
dataPinningService.pinData(
  'transform-node',
  { user: { id: 1, name: 'John' } },
  'manual',
  'Test data for user transformation'
);

// Pin data from execution results
dataPinningService.pinFromExecution(
  'transform-node',
  executionResult.data,
  'Captured from successful run #42'
);

// Generate sample data
const sampleData = dataPinningService.generateSampleData('http-request');
dataPinningService.pinData('api-call-node', sampleData);
```

### 3. Debug with Breakpoints

Set breakpoints and step through execution:

```typescript
import { debugManager } from '../execution/DebugManager';

// Create debug session
const session = debugManager.createSession(nodes, edges);

// Add simple breakpoint
debugManager.addBreakpoint(session.id, 'validate-node');

// Add conditional breakpoint
debugManager.addBreakpoint(
  session.id,
  'process-node',
  'value > 100' // Only pause if condition is true
);

// Execute with debugging
await executor.executeFromNode(
  { startNodeId: 'start-node', testData: { value: 150 } },
  undefined,
  (nodeId, result) => {
    if (debugManager.shouldPauseAtNode(session.id, nodeId, result.data)) {
      console.log('⏸️ Paused at breakpoint');
      debugManager.pause(session.id, nodeId, result.data);

      // Inspect variables
      const vars = debugManager.getVariables(session.id, nodeId);
      console.log('Variables:', vars);
    }
  }
);
```

---

## UI Components

### NodeTestData Dialog

Edit test data for any node:

```typescript
import NodeTestData from '../components/NodeTestData';

<NodeTestData
  nodeId="transform-node"
  nodeType="transform"
  nodeLabel="Transform User Data"
  isOpen={isDialogOpen}
  onClose={() => setIsDialogOpen(false)}
  onSave={(data) => {
    // Save test data
    dataPinningService.pinData('transform-node', data);
  }}
  initialData={{ user: { id: 1 } }}
/>
```

### DataPinningPanel

Manage all pinned data:

```typescript
import DataPinningPanel from '../components/DataPinningPanel';

<DataPinningPanel />
```

Features:
- View all pinned data
- Unpin data
- Export/import pinned data
- View data details
- Statistics dashboard

### DebugControls

Control debugging execution:

```typescript
import DebugControls from '../components/DebugControls';

<DebugControls
  sessionId={debugSessionId}
  onPlay={() => debugManager.continue(sessionId)}
  onPause={() => debugManager.pause(sessionId, currentNode)}
  onStop={() => debugManager.stop(sessionId)}
  onStepOver={() => debugManager.stepOver(sessionId)}
  onStepInto={() => debugManager.stepInto(sessionId)}
  onStepOut={() => debugManager.stepOut(sessionId)}
/>
```

---

## Common Use Cases

### Use Case 1: Test a Transformation Node

```typescript
// 1. Generate sample input data
const inputData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
};

// 2. Pin the data
dataPinningService.pinData('transform-user', inputData, 'manual');

// 3. Execute from that node
const result = await executor.executeFromNode({
  startNodeId: 'transform-user',
  testData: inputData
});

// 4. Check output
console.log('Transformed:', result.results.get('transform-user')?.data);
```

### Use Case 2: Debug Complex Logic

```typescript
const session = debugManager.createSession(nodes, edges);

// Add breakpoints at key points
debugManager.addBreakpoint(session.id, 'validate-input');
debugManager.addBreakpoint(session.id, 'process-data');
debugManager.addBreakpoint(session.id, 'save-result');

// Execute with step-through
await executor.executeFromNode(
  { startNodeId: 'validate-input', testData: complexData },
  (nodeId) => {
    console.log(`Starting: ${nodeId}`);
  },
  (nodeId, result) => {
    if (debugManager.shouldPauseAtNode(session.id, nodeId)) {
      console.log(`⏸️ Paused at: ${nodeId}`);

      // Inspect state
      const vars = debugManager.getVariables(session.id, nodeId);
      console.log('State:', vars);

      // Step over to next node
      debugManager.stepOver(session.id);
    }
  }
);
```

### Use Case 3: Test with Multiple Data Sets

```typescript
const testCases = [
  { name: 'Valid user', data: { id: 1, email: 'valid@example.com' } },
  { name: 'Invalid email', data: { id: 2, email: 'invalid' } },
  { name: 'Missing id', data: { email: 'test@example.com' } }
];

for (const testCase of testCases) {
  console.log(`Testing: ${testCase.name}`);

  const result = await executor.executeFromNode({
    startNodeId: 'validate-user',
    testData: testCase.data
  });

  if (result.success) {
    console.log('✅ Passed');
  } else {
    console.log('❌ Failed:', result.errors);
  }
}
```

### Use Case 4: Export/Import Test Scenarios

```typescript
// Export all pinned data for sharing
const pinnedData = dataPinningService.exportPinnedData();

// Save to file
const blob = new Blob([JSON.stringify(pinnedData, null, 2)], {
  type: 'application/json'
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'test-scenarios.json';
a.click();

// Later, import test scenarios
const response = await fetch('test-scenarios.json');
const data = await response.json();
const count = dataPinningService.importPinnedData(data);
console.log(`Imported ${count} test scenarios`);
```

---

## Advanced Features

### Conditional Breakpoints

Pause only when specific conditions are met:

```typescript
// Pause when value exceeds threshold
debugManager.addBreakpoint(session.id, 'check-value', 'value > 1000');

// Pause when status is error
debugManager.addBreakpoint(session.id, 'validate', 'status === "error"');

// Pause on specific user
debugManager.addBreakpoint(session.id, 'process-user', 'userId === 123');
```

### Schema Inference

Automatically infer data structure:

```typescript
const service = new DataPinningService({ enableSchemaInference: true });

const pinned = service.pinData('node-1', {
  user: {
    name: 'John',
    age: 30,
    active: true
  },
  items: [1, 2, 3]
});

console.log(pinned.schema);
// {
//   type: 'object',
//   properties: {
//     user: {
//       type: 'object',
//       properties: {
//         name: { type: 'string' },
//         age: { type: 'number' },
//         active: { type: 'boolean' }
//       }
//     },
//     items: {
//       type: 'array',
//       items: { type: 'number' }
//     }
//   }
// }
```

### Stop at Specific Node

```typescript
const result = await executor.executeFromNode({
  startNodeId: 'start',
  stopAtNodeId: 'checkpoint', // Stop before this node
  testData: { value: 42 }
});

console.log('Stopped at checkpoint');
```

### Execution Stack Tracking

```typescript
const session = debugManager.createSession(nodes, edges);

await executor.executeFromNode(
  { startNodeId: 'start' },
  (nodeId) => {
    debugManager.pushToStack(session.id, nodeId);
  },
  (nodeId) => {
    debugManager.popFromStack(session.id);
  }
);

const stack = debugManager.getExecutionStack(session.id);
console.log('Execution path:', stack);
```

---

## Best Practices

### 1. Naming Conventions

```typescript
// Good: Descriptive names for pinned data
dataPinningService.pinData(
  'transform-user',
  data,
  'manual',
  'Valid user with all required fields'
);

// Bad: No description
dataPinningService.pinData('transform-user', data);
```

### 2. Test Data Organization

```typescript
// Create reusable test data templates
const TEST_DATA = {
  validUser: { id: 1, name: 'John', email: 'john@example.com' },
  invalidUser: { id: -1, name: '', email: 'invalid' },
  edgeCase: { id: Number.MAX_SAFE_INTEGER, name: 'x'.repeat(1000) }
};

// Use templates
dataPinningService.pinData('node', TEST_DATA.validUser, 'manual', 'Valid user');
```

### 3. Cleanup After Debugging

```typescript
// Stop session when done
debugManager.stop(sessionId);
debugManager.deleteSession(sessionId);

// Clear breakpoints
debugManager.clearAllBreakpoints(sessionId);

// Optionally clear pinned data
dataPinningService.clearAll();
```

### 4. Error Handling

```typescript
try {
  const result = await executor.executeFromNode({
    startNodeId: 'invalid-node',
    testData: {}
  });
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Node does not exist');
  } else {
    console.error('Execution failed:', error);
  }
}
```

---

## Keyboard Shortcuts

When debugging is active:

- **F10** - Step Over (execute current node and pause at next)
- **F11** - Step Into (enter sub-workflow)
- **Shift+F11** - Step Out (exit current sub-workflow)
- **F5** - Continue execution
- **Shift+F5** - Stop debugging

---

## Performance Tips

### 1. Limit Pinned Data Size

```typescript
// Configure max data size
const service = new DataPinningService({
  maxDataSize: 5 * 1024 * 1024 // 5MB
});
```

### 2. Use Validation Wisely

```typescript
// Disable validation for trusted data
const service = new DataPinningService({
  autoValidate: false
});
```

### 3. Batch Operations

```typescript
// Import multiple at once instead of one-by-one
const batchData = {
  'node-1': pinnedData1,
  'node-2': pinnedData2,
  'node-3': pinnedData3
};
dataPinningService.importPinnedData(batchData);
```

---

## Troubleshooting

### Issue: "Start node not found"

```typescript
// Verify node exists
const nodeExists = nodes.some(n => n.id === 'my-node');
if (!nodeExists) {
  console.error('Node ID is incorrect');
}
```

### Issue: "Data size exceeds maximum"

```typescript
// Check data size
const dataSize = new Blob([JSON.stringify(data)]).size;
console.log(`Data size: ${dataSize} bytes`);

// Reduce data or increase limit
const service = new DataPinningService({
  maxDataSize: 10 * 1024 * 1024 // 10MB
});
```

### Issue: Breakpoint not triggering

```typescript
// Check if breakpoint is enabled
const breakpoint = session.breakpoints.get(nodeId);
console.log('Enabled:', breakpoint?.enabled);

// Check condition
if (breakpoint?.condition) {
  console.log('Condition:', breakpoint.condition);
}
```

---

## API Reference

### PartialExecutor

```typescript
class PartialExecutor {
  executeFromNode(options: PartialExecutionOptions): Promise<PartialExecutionResult>
  buildExecutionSubgraph(startNodeId: string): ExecutionSubgraph
  validateSubgraph(subgraph: ExecutionSubgraph, testData?: SafeObject): ValidationResult
  getExecutionMetrics(): ExecutionMetrics
  stop(): void
  isRunning(): boolean
}
```

### DataPinningService

```typescript
class DataPinningService {
  pinData(nodeId: string, data: SafeObject, source?: string, description?: string): PinnedData
  unpinData(nodeId: string): boolean
  getPinnedData(nodeId: string): PinnedData | undefined
  hasPinnedData(nodeId: string): boolean
  updatePinnedData(nodeId: string, data: SafeObject, description?: string): PinnedData
  clearAll(): void
  exportPinnedData(): Record<string, PinnedData>
  importPinnedData(data: Record<string, PinnedData>): number
  generateSampleData(nodeType: string): SafeObject
  getStats(): DataPinningStats
}
```

### DebugManager

```typescript
class DebugManager {
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
  onEvent(callback: DebugEventCallback): () => void
  getStats(sessionId: string): DebugStats
  clearAllBreakpoints(sessionId: string): void
  exportSession(sessionId: string): Record<string, unknown> | null
}
```

---

## Examples Repository

Check the `src/__tests__/` directory for more examples:
- `partialExecution.test.ts` - Basic usage
- `dataPinning.test.ts` - Data management
- `debugManager.test.ts` - Debugging features
- `partialExecution.integration.test.ts` - Real-world scenarios

---

*For more information, see the full implementation report: `AGENT_14_PARTIAL_EXECUTION_DEBUG_REPORT.md`*
