# NLP Workflow Parser - Integration Guide

## Quick Start

### 1. Import the Component

```typescript
import { TextToWorkflowEditor } from './components/TextToWorkflowEditor';
```

### 2. Add to Your App

```typescript
// In App.tsx or similar
function App() {
  const [showNLP, setShowNLP] = useState(false);

  return (
    <div>
      {/* Add button to navigation */}
      <button onClick={() => setShowNLP(true)}>
        ✨ Create with AI
      </button>

      {/* Show NLP editor */}
      {showNLP && (
        <div className="nlp-editor-container">
          <TextToWorkflowEditor />
        </div>
      )}
    </div>
  );
}
```

### 3. Add to Navigation Menu

```typescript
// Add to sidebar or header
<nav>
  <Link to="/workflows">Workflows</Link>
  <Link to="/nlp">✨ Create with AI</Link>  {/* New */}
  <Link to="/templates">Templates</Link>
</nav>
```

## Usage Examples

### Example 1: Simple Notification

**User Input:**
```
Send a Slack message to #general every morning at 9am
```

**Generated Workflow:**
- Schedule Trigger (9 AM daily)
- Slack Node (channel: #general)

### Example 2: Data Pipeline

**User Input:**
```
Every hour, fetch data from https://api.example.com, transform it, and save to PostgreSQL
```

**Generated Workflow:**
- Schedule Trigger (hourly)
- HTTP Request Node (GET from API)
- Transform Node
- PostgreSQL Node

### Example 3: Webhook Processing

**User Input:**
```
When webhook received, validate the data, save to database, and notify team on Slack
```

**Generated Workflow:**
- Webhook Trigger
- Filter/Validate Node
- PostgreSQL Node
- Slack Node

## Advanced Usage

### Programmatic Access

```typescript
import { ConversationManager } from '../nlp/ConversationManager';
import { IntentRecognizer } from '../nlp/IntentRecognizer';
import { WorkflowGenerator } from '../nlp/WorkflowGenerator';

// Direct intent recognition
const recognizer = new IntentRecognizer();
const result = await recognizer.recognize(
  'Every morning fetch HN stories and send to Slack'
);

// Generate workflow
const generator = new WorkflowGenerator();
const workflow = await generator.generate(result.primaryIntent);

// Apply to canvas
setNodes(workflow.nodes);
setEdges(workflow.edges);
```

### Custom Patterns

```typescript
// Add custom automation pattern
import { automationPatterns } from '../nlp/patterns/AutomationPatterns';

automationPatterns.push({
  id: 'custom-pattern',
  name: 'My Custom Pattern',
  description: 'Custom workflow automation',
  keywords: ['custom', 'special', 'unique'],
  triggerType: 'schedule',
  actionSequence: ['fetch', 'transform', 'notify'],
  examples: [
    'My custom workflow example'
  ],
  nodeTemplate: {
    nodes: [],
    edges: []
  },
  confidence: 0.85
});
```

### Parameter Inference Configuration

```typescript
import { ParameterInferencer } from '../nlp/ParameterInferencer';

const inferencer = new ParameterInferencer();

// Get all defaults for a node type
const slackDefaults = inferencer.getAllDefaults('slack');
// { channel: '#general', username: 'Workflow Bot', icon_emoji: ':robot_face:' }

// Infer specific parameter
const schedule = await inferencer.inferValue(
  'schedule',
  'Every morning at 9am'
);
// '0 9 * * *'
```

## Testing

### Run All Tests

```bash
npm run test src/__tests__/nlp/
```

### Run Specific Test File

```bash
npm run test src/__tests__/nlp/intentRecognizer.test.ts
```

### Run with Coverage

```bash
npm run test:coverage src/__tests__/nlp/
```

## Styling

The components use Tailwind CSS. Customize by modifying the class names:

```typescript
// In TextToWorkflowEditor.tsx
<div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
  {/* Customize gradient colors */}
</div>
```

## Performance Tips

1. **Debounce Input:**
```typescript
import { useMemo, useCallback } from 'react';
import debounce from 'lodash/debounce';

const debouncedProcess = useCallback(
  debounce((text) => manager.processMessage(contextId, text), 500),
  [contextId]
);
```

2. **Memoize Conversation:**
```typescript
const conversationPanel = useMemo(
  () => <ConversationPanel conversation={conversation} />,
  [conversation.messages.length]
);
```

3. **Lazy Load:**
```typescript
const TextToWorkflowEditor = lazy(() =>
  import('./components/TextToWorkflowEditor')
);
```

## Troubleshooting

### Issue: Low Intent Recognition Accuracy

**Solution:** Add more examples to automation patterns in `src/nlp/patterns/AutomationPatterns.ts`

### Issue: Missing Parameters

**Solution:** Check ParameterInferencer defaults and add more inference rules

### Issue: Slow Performance

**Solution:**
1. Check pattern matching complexity
2. Reduce number of patterns
3. Add caching for frequently used intents

### Issue: Conversations Not Persisting

**Solution:** Implement conversation persistence:

```typescript
// Save conversation to localStorage
localStorage.setItem(
  `conversation_${contextId}`,
  JSON.stringify(conversation)
);

// Restore conversation
const saved = localStorage.getItem(`conversation_${contextId}`);
if (saved) {
  const conversation = JSON.parse(saved);
  // Restore state
}
```

## Best Practices

1. **Clear Examples:** Provide 5-10 example prompts for users
2. **Validation:** Always validate generated workflows before execution
3. **Feedback:** Show processing indicators during workflow generation
4. **Error Handling:** Gracefully handle low-confidence intents
5. **Testing:** Test with real user inputs before deployment

## API Reference

### ConversationManager

```typescript
class ConversationManager {
  startConversation(): string
  processMessage(contextId: string, message: string): Promise<TextToWorkflowResult>
  getConversation(contextId: string): ConversationContext | null
  clearConversation(contextId: string): void
}
```

### IntentRecognizer

```typescript
class IntentRecognizer {
  recognize(input: string): Promise<IntentRecognitionResult>
}
```

### WorkflowGenerator

```typescript
class WorkflowGenerator {
  generate(intent: Intent): Promise<WorkflowGenerationResult>
}
```

### ParameterInferencer

```typescript
class ParameterInferencer {
  inferValue(paramName: string, text: string, context?: ConversationContext): Promise<unknown>
  inferParameters(intent: Intent, context?: ConversationContext): Promise<InferredParameter[]>
  getDefault(nodeType: string, paramName: string): unknown
  getAllDefaults(nodeType: string): Record<string, unknown>
}
```

## Support

For issues or questions:
1. Check the comprehensive test suite for usage examples
2. Review AGENT51_NLP_WORKFLOW_PARSER_REPORT.md
3. Examine the source code comments
4. Create an issue with example input/output

## License

Same as main project
