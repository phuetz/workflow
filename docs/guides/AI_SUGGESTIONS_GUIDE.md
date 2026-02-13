# AI-Powered Smart Suggestions - Complete Guide

## Overview

The AI-Powered Smart Suggestions system provides intelligent, context-aware recommendations to improve workflow development productivity and quality. It includes four main features:

1. **Auto-Naming** - Intelligent node naming based on configuration and context
2. **Smart Recommendations** - Next node suggestions and workflow templates
3. **Context-Aware Completions** - Intelligent autocomplete for expressions and parameters
4. **Quality Analysis** - Comprehensive workflow quality scoring and improvement recommendations

## Table of Contents

- [Auto-Naming](#auto-naming)
- [Smart Recommendations](#smart-recommendations)
- [Context-Aware Completions](#context-aware-completions)
- [Quality Analysis](#quality-analysis)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

---

## Auto-Naming

### Overview

Auto-Naming automatically generates meaningful, descriptive names for workflow nodes based on:
- Node type (HTTP Request, Database, Email, etc.)
- Configuration (URL, method, table name, etc.)
- Position in workflow (first, middle, last)
- Connected nodes (previous and next nodes)

### Features

#### Intelligent Pattern Matching

Auto-naming uses pattern libraries for each node type:

**HTTP Request:**
- `GET /api/users` → "Fetch Users from API"
- `POST /api/orders` → "Create New Order"
- `PUT /api/users/123` → "Update User Information"
- `DELETE /api/sessions` → "Delete User Session"

**Database:**
- `SELECT FROM customers` → "Query Customers Records"
- `INSERT INTO orders` → "Add Record to Orders"
- `UPDATE users SET ...` → "Modify Users Records"

**Email:**
- Subject: "Welcome..." → "Send Welcome Email to User"
- Subject: "Invoice..." → "Send Invoice to Customer"
- To: admin@... → "Notify Admin via Email"

**Conditional/Loops:**
- `if status === 'active'` → "Check Status Condition"
- `forEach users` → "Process Each User"

#### Context-Aware Prefixes

- **First node**: Automatically adds "Trigger: " prefix
  - Example: "Trigger: Stripe Webhook"

- **Last node**: Can add "Final: " prefix
  - Example: "Final: Send Confirmation Email"

#### Uniqueness Guarantee

If a generated name already exists, auto-naming adds a number:
- "HTTP Request" → "HTTP Request 1", "HTTP Request 2", etc.

### Usage

#### Generate Name for Single Node

```typescript
import { autoNamingService } from '../ai/AutoNaming';

const result = autoNamingService.generateNodeName(
  node,
  allNodes,
  edges,
  {
    useContextPrefix: true,
    ensureUniqueness: true,
    maxLength: 50
  }
);

console.log(result.suggestedName); // "Fetch Users from API"
console.log(result.confidence); // 85
console.log(result.reasoning); // "Based on node type: httpRequest; HTTP method: GET"
console.log(result.alternatives); // ["Fetch Users", "API Call", ...]
```

#### Bulk Rename Workflow

```typescript
// Preview rename
const previews = autoNamingService.previewBulkRename(nodes, edges);

// Review previews
previews.forEach(preview => {
  console.log(`${preview.currentName} → ${preview.suggestedName} (${preview.confidence}%)`);
});

// Apply rename
const { renamed, skipped } = autoNamingService.applyBulkRename(
  nodes,
  edges,
  (nodeId, updates) => updateNode(nodeId, updates)
);

console.log(`Renamed ${renamed} nodes, skipped ${skipped}`);
```

#### Analyze Naming Quality

```typescript
const analysis = autoNamingService.analyzeWorkflowNaming(nodes);

console.log(`Score: ${analysis.score}/100`);
console.log('Issues:', analysis.issues);
console.log('Suggestions:', analysis.suggestions);
```

### Configuration

```typescript
interface AutoNamingOptions {
  useContextPrefix?: boolean;      // Add "Trigger:", "Final:", etc.
  ensureUniqueness?: boolean;      // Guarantee unique names
  followWorkflowConventions?: boolean; // Use workflow-specific patterns
  maxLength?: number;              // Maximum name length (default: 50)
}
```

---

## Smart Recommendations

### Overview

Smart Recommendations provides three types of suggestions:

1. **Next Node Suggestions** - What node to add next
2. **Workflow Templates** - Relevant pre-built workflows
3. **Optimization Suggestions** - Performance, cost, and reliability improvements

### Features

#### Next Node Suggestions

Based on current node, the system suggests likely next steps:

**After HTTP Request:**
- IF condition (90% confidence) - "Check response status"
- Transform Data (85% confidence) - "Extract API response"
- Loop (75% confidence) - "Process each item"

**After Webhook:**
- Validate Data (95% confidence) - "Verify webhook payload"
- Parse JSON (90% confidence) - "Extract webhook data"
- Error Handler (88% confidence) - "Add error handling"

**After Database:**
- Loop (85% confidence) - "Process each record"
- Transform (80% confidence) - "Format database data"
- Notification (70% confidence) - "Alert on results"

#### Workflow Templates

Suggests relevant templates based on detected patterns:

**E-commerce Pattern** (Stripe + Database + Email):
- "Payment Processing Workflow" (95% relevance)
- "Order Fulfillment Automation" (88% relevance)

**Monitoring Pattern** (Database + Slack):
- "Monitoring & Alerts" (90% relevance)
- "Daily Reports to Slack" (85% relevance)

**Data Sync Pattern** (Google Sheets + Database):
- "Data Synchronization" (88% relevance)
- "Sheet to Database Sync" (82% relevance)

#### Optimization Suggestions

Detects anti-patterns and suggests improvements:

**Performance:**
- "API Calls Inside Loop" → "Enable batch API calls" (10-100x faster)
- "Parallelizable Sequence" → "Enable parallel execution" (50% faster)
- "No Caching" → "Add caching" (90% cost reduction)

**Security:**
- "Webhook Missing Validation" → "Add input validation" (Critical)
- "Credentials in Config" → "Use credentials manager" (High)
- "HTTP not HTTPS" → "Switch to HTTPS" (Medium)

**Best Practices:**
- "Missing Error Handling" → "Add error handler"
- "No Logging" → "Add logging for debugging"
- "Generic Names" → "Use descriptive names"

### Usage

#### Get Next Node Suggestions

```typescript
import { workflowRecommender } from '../ai/WorkflowRecommender';

const suggestions = workflowRecommender.suggestNextNodes({
  currentNode: selectedNode,
  allNodes: nodes,
  edges: edges,
  availableNodeTypes: nodeTypes
});

// Display suggestions
suggestions.forEach(suggestion => {
  console.log(`${suggestion.label} (${suggestion.confidence}%)`);
  console.log(`  ${suggestion.description}`);
  console.log(`  Reason: ${suggestion.reason}`);
});
```

#### Get Template Suggestions

```typescript
const templates = workflowRecommender.suggestTemplates({
  allNodes: nodes,
  edges: edges,
  availableNodeTypes: []
});

templates.forEach(template => {
  console.log(`${template.name} (${template.relevanceScore}%)`);
  console.log(`  ${template.description}`);
  console.log(`  Matching: ${template.matchingNodes.join(', ')}`);
});
```

#### Get Optimization Suggestions

```typescript
const optimizations = workflowRecommender.suggestOptimizations({
  allNodes: nodes,
  edges: edges,
  availableNodeTypes: []
});

optimizations.forEach(opt => {
  console.log(`[${opt.type}] ${opt.title}`);
  console.log(`  Impact: ${opt.impact}`);
  console.log(`  Improvement: ${opt.estimatedImprovement}`);
  console.log(`  Action: ${opt.action}`);
});
```

---

## Context-Aware Completions

### Overview

Provides intelligent autocomplete for:
- Expression variables (`{{ }}`)
- Node references (`$node["..."]`)
- Built-in functions (`now()`, `uuid()`, etc.)
- URL suggestions
- Email templates
- HTTP headers

### Features

#### Expression Autocomplete

When typing `{{ }}`, suggests:
- **Variables from previous nodes**: `$node["Fetch Users"].json`
- **Built-in functions**: `now()`, `uuid()`, `base64()`
- **Environment variables**: `$env.API_KEY`

#### Parameter Suggestions

**URL Field:**
- Environment variables: `{{$env.API_BASE_URL}}`
- Recent URLs: `https://api.example.com/users`

**Email Field:**
- Templates: "Welcome to our service!"
- Variables: `{{$json.customerName}}`

**Headers:**
- Common headers: `Content-Type: application/json`
- Auth headers: `Authorization: Bearer {{$env.API_TOKEN}}`

#### Default Value Suggestions

Based on node type and best practices:

**HTTP Request:**
- Timeout: `30000` (30 seconds)
- Retry: `{ attempts: 3, delay: 1000 }`
- Headers: `{ "Content-Type": "application/json" }`

**Database:**
- Timeout: `60000` (60 seconds)
- Max Retries: `3`

**Email:**
- From: `{{$env.EMAIL_FROM}}`
- Reply-To: `{{$env.EMAIL_REPLY_TO}}`

### Usage

#### Get Autocomplete Suggestions

```typescript
import { smartCompletionService } from '../ai/SmartCompletion';

const suggestions = smartCompletionService.getSuggestions({
  text: '{{ $node',
  cursorPosition: 7,
  currentNode: node,
  allNodes: nodes,
  edges: edges,
  field: 'url'
});

// Display suggestions
suggestions.forEach(item => {
  console.log(`${item.label} - ${item.description}`);
  console.log(`  Type: ${item.type}, Score: ${item.score}`);
});
```

#### Track Usage for Learning

```typescript
// When user selects a suggestion
smartCompletionService.trackUsage(suggestion.value);

// Future suggestions will prioritize frequently used items
```

#### Get Parameter Suggestions

```typescript
import { parameterSuggester } from '../ai/ParameterSuggester';

const suggestions = parameterSuggester.suggestParameters('httpRequest', {
  method: 'GET'
});

suggestions.forEach(s => {
  console.log(`${s.field}: ${s.value}`);
  console.log(`  ${s.description} (${s.confidence}%)`);
});
```

#### Get Config Templates

```typescript
const templates = parameterSuggester.getConfigTemplates('slack');

templates.forEach(template => {
  console.log(`${template.name}`);
  console.log(`  ${template.description}`);
  console.log(`  Use case: ${template.useCase}`);
  console.log('  Config:', template.config);
});
```

---

## Quality Analysis

### Overview

Analyzes workflow quality across 7 dimensions:
1. **Error Handling** (20%) - Coverage of error-prone nodes
2. **Logging** (15%) - Logging for critical operations
3. **Performance** (15%) - Optimization opportunities
4. **Security** (20%) - Security best practices
5. **Complexity** (10%) - Code complexity and depth
6. **Documentation** (10%) - Naming and documentation
7. **Maintainability** (10%) - Code quality and patterns

### Quality Scoring

**Grade Scale:**
- **A (90-100)**: Excellent quality, production-ready
- **B (80-89)**: Good quality, minor improvements needed
- **C (70-79)**: Acceptable quality, several improvements recommended
- **D (60-69)**: Below average, significant improvements needed
- **F (<60)**: Poor quality, major improvements required

### Features

#### Quality Report

```typescript
import { qualityAnalyzer } from '../ai/QualityAnalyzer';

const report = qualityAnalyzer.analyzeWorkflow(nodes, edges);

console.log(`Overall Score: ${report.score.overall}/100`);
console.log(`Grade: ${report.grade}`);
console.log(`Summary: ${report.summary}`);

// Dimension scores
Object.entries(report.score.dimensions).forEach(([dimension, score]) => {
  console.log(`${dimension}: ${score}/100`);
});

// Issues
report.issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.title}`);
  console.log(`  ${issue.description}`);
  console.log(`  Impact: ${issue.impact}`);
});

// Recommendations
report.recommendations.forEach(rec => {
  console.log(`Priority ${rec.priority}: ${rec.title}`);
  console.log(`  ${rec.description}`);
  console.log(`  Benefit: ${rec.benefit}`);
  console.log(`  Improvement: +${rec.estimatedImprovement} points`);
});

// Predictions
console.log('Predictions:');
console.log(`  Execution Time: ${report.predictions.estimatedExecutionTime}`);
console.log(`  Estimated Cost: ${report.predictions.estimatedCost}`);
console.log(`  CPU Usage: ${report.predictions.resourceUsage.cpu}`);
console.log(`  Memory Usage: ${report.predictions.resourceUsage.memory}`);
console.log(`  Scalability: ${report.predictions.scalabilityScore}/100`);
console.log(`  Reliability: ${report.predictions.reliabilityScore}/100`);
```

---

## Configuration

### Disable Suggestions

Users can disable suggestions globally or per-workflow:

```typescript
// Store in user preferences
localStorage.setItem('ai-suggestions-enabled', 'false');

// Or per-workflow
workflow.metadata.aiSuggestionsDisabled = true;
```

### Suggestion Feedback

Track user feedback to improve suggestions:

```typescript
// When user accepts suggestion
trackSuggestionFeedback(suggestion.id, 'accepted');

// When user dismisses suggestion
trackSuggestionFeedback(suggestion.id, 'dismissed');

// When user provides explicit feedback
trackSuggestionFeedback(suggestion.id, 'thumbs-up');
trackSuggestionFeedback(suggestion.id, 'thumbs-down');
```

### Analytics

Track suggestion acceptance rate:

```typescript
const analytics = {
  suggestionsShown: 100,
  suggestionsAccepted: 72,
  acceptanceRate: 0.72, // 72%

  byType: {
    'next-node': { shown: 50, accepted: 40, rate: 0.80 },
    'optimization': { shown: 30, accepted: 22, rate: 0.73 },
    'auto-naming': { shown: 20, accepted: 10, rate: 0.50 }
  }
};
```

---

## API Reference

### AutoNamingService

```typescript
class AutoNamingService {
  generateNodeName(
    node: WorkflowNode,
    allNodes: WorkflowNode[],
    edges: WorkflowEdge[],
    options?: AutoNamingOptions
  ): AutoNamingResult;

  previewBulkRename(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): BulkRenamePreview[];

  applyBulkRename(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    updateNode: (nodeId: string, updates: Partial<NodeData>) => void
  ): { renamed: number; skipped: number };

  analyzeWorkflowNaming(
    nodes: WorkflowNode[]
  ): { score: number; issues: string[]; suggestions: any[] };

  clearCache(): void;
}
```

### WorkflowRecommender

```typescript
class WorkflowRecommender {
  suggestNextNodes(
    context: RecommendationContext
  ): NextNodeSuggestion[];

  suggestTemplates(
    context: RecommendationContext
  ): TemplateSuggestion[];

  suggestOptimizations(
    context: RecommendationContext
  ): OptimizationSuggestion[];

  clearCache(): void;
}
```

### SmartCompletionService

```typescript
class SmartCompletionService {
  getSuggestions(
    context: CompletionContext
  ): CompletionItem[];

  trackUsage(value: string): void;

  clearHistory(): void;
}
```

### ParameterSuggester

```typescript
class ParameterSuggester {
  suggestParameters(
    nodeType: string,
    existingConfig?: Record<string, any>
  ): ParameterSuggestion[];

  getConfigTemplates(nodeType: string): ConfigTemplate[];

  getDefaultValue(nodeType: string, field: string): any;

  validateAndSuggest(
    nodeType: string,
    field: string,
    value: any
  ): { valid: boolean; suggestion?: any; message?: string };

  trackUsage(nodeType: string, field: string, value: any): void;

  clearHistory(): void;
}
```

### QualityAnalyzer

```typescript
class QualityAnalyzer {
  analyzeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): QualityReport;
}
```

---

## Best Practices

### 1. Use Auto-Naming Early

Run auto-naming when you first add nodes, not after the workflow is complete:

```typescript
// Good: Name node immediately after adding
addNode(newNode);
const naming = autoNamingService.generateNodeName(newNode, allNodes, edges);
updateNode(newNode.id, { label: naming.suggestedName });

// Avoid: Generic names that stay forever
addNode({ ...newNode, label: 'HTTP Request' });
```

### 2. Review Suggestions Before Applying

Don't blindly accept all suggestions:

```typescript
// Good: Review and selectively apply
const suggestions = workflowRecommender.suggestNextNodes(context);
const relevantSuggestions = suggestions.filter(s => s.confidence > 80);

// Avoid: Auto-applying without review
suggestions.forEach(s => applyNode(s)); // Too aggressive
```

### 3. Run Quality Analysis Regularly

Check quality score periodically:

```typescript
// Run quality check before deployment
if (workflow.status === 'ready-for-production') {
  const report = qualityAnalyzer.analyzeWorkflow(nodes, edges);

  if (report.score.overall < 70) {
    console.warn('Quality too low for production');
    showRecommendations(report.recommendations);
  }
}
```

### 4. Provide Feedback

Help improve suggestions by providing feedback:

```typescript
// Track what suggestions are helpful
onSuggestionAccepted((suggestion) => {
  trackFeedback(suggestion.id, 'accepted');
});

onSuggestionDismissed((suggestion) => {
  trackFeedback(suggestion.id, 'dismissed');
});
```

### 5. Customize for Your Workflow

Adapt suggestions to your specific needs:

```typescript
// Add custom naming patterns
NAMING_PATTERNS['customNode'] = {
  nodeType: 'customNode',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.action === 'process',
      template: (config) => `Process ${config.resource}`
    }
  ]
};
```

---

## Success Metrics

The AI Suggestions system tracks these metrics:

- **Auto-naming accuracy**: > 85% (names are meaningful and appropriate)
- **Suggestion relevance**: > 80% (users accept suggestions)
- **Completion speed**: < 100ms (autocomplete appears instantly)
- **Quality correlation**: > 0.9 (quality score predicts actual issues)
- **User satisfaction**: > 70% (users find suggestions helpful)

---

## Troubleshooting

### Suggestions Not Appearing

1. Check if suggestions are enabled
2. Verify node is selected
3. Clear cache: `autoNamingService.clearCache()`

### Low Quality Score Despite Good Workflow

1. Review dimension scores to see which area is low
2. Add logging for critical operations
3. Improve node naming
4. Add error handling

### Autocomplete Not Working

1. Check cursor position in expression
2. Verify node has previous nodes (for variable suggestions)
3. Clear completion history: `smartCompletionService.clearHistory()`

---

## Future Enhancements

Planned improvements:

1. **Machine Learning**: Learn from user patterns over time
2. **Team Learning**: Share suggestions across team members
3. **Industry Templates**: Pre-built workflows for specific industries
4. **Performance Profiling**: Real execution data for better predictions
5. **A/B Testing**: Test different suggestion strategies

---

## Support

For questions or issues:
- GitHub Issues: [workflow-automation/issues](https://github.com/workflow-automation/issues)
- Documentation: [docs.workflow-automation.com](https://docs.workflow-automation.com)
- Email: support@workflow-automation.com

---

**Version**: 1.0.0
**Last Updated**: 2025-01-18
**Author**: Agent 44
