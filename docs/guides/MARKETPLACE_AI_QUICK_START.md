# Marketplace & AI Features - Quick Start Guide

## What's New?

The workflow automation platform now includes:

1. **100+ Workflow Templates** - Professional, production-ready templates
2. **AI Workflow Generator** - Convert natural language to workflows
3. **Smart Optimizer** - AI-powered workflow optimization
4. **Enhanced Marketplace** - Advanced search, ratings, reviews

---

## Quick Start

### 1. Browse Templates

```typescript
import { templateService } from './services/TemplateService';

// Get all templates
const templates = templateService.getAll();

// Search templates
const results = templateService.search('email automation', {
  category: 'marketing',
  difficulty: 'beginner'
});

// Get featured templates
const featured = templateService.getFeatured();
```

### 2. Install a Template

```typescript
// Install with customizations
const installation = await templateService.install('lead-qualification-pipeline', {
  'webhook-1': {
    path: '/my-webhook'
  },
  'slack-1': {
    channel: '#sales'
  }
});

console.log(`Workflow created: ${installation.workflowId}`);
```

### 3. Generate Workflow with AI

```typescript
import { getAIWorkflowGenerator } from './services/AIWorkflowGeneratorService';
import { llmService } from './services/LLMService';

const generator = getAIWorkflowGenerator(llmService);

const result = await generator.generateWorkflow({
  prompt: "When a customer submits a contact form, send me an email and add them to Salesforce",
  constraints: {
    maxNodes: 10
  }
});

console.log(`Generated ${result.workflow.nodes.length} nodes`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Explanation: ${result.explanation}`);
```

### 4. Optimize Existing Workflow

```typescript
import { getWorkflowOptimizer } from './services/WorkflowOptimizerService';

const optimizer = getWorkflowOptimizer(llmService);
const analysis = await optimizer.analyzeWorkflow(nodes, edges);

console.log(`Score: ${analysis.overallScore}/100`);
console.log(`Suggestions: ${analysis.suggestions.length}`);

// Show critical issues
const critical = analysis.suggestions.filter(s => s.severity === 'critical');
critical.forEach(s => {
  console.log(`❌ ${s.title}`);
  console.log(`   ${s.recommendation}`);
});
```

---

## API Usage

### Template Endpoints

```bash
# Get all templates
GET /api/templates

# Search templates
GET /api/templates?search=email&category=marketing&difficulty=beginner

# Get featured templates
GET /api/templates/featured

# Get template details
GET /api/templates/lead-qualification-pipeline

# Install template
POST /api/templates/lead-qualification-pipeline/install
{
  "customizations": {
    "webhook-1": { "path": "/my-webhook" }
  }
}

# Get marketplace
GET /api/templates/marketplace
```

### AI Endpoints (Recommended to Add)

```bash
# Generate workflow
POST /api/ai/generate-workflow
{
  "prompt": "Send Slack notification when order is placed",
  "constraints": { "maxNodes": 10 }
}

# Optimize workflow
POST /api/ai/optimize-workflow
{
  "nodes": [...],
  "edges": [...]
}
```

---

## Template Categories

- **Business Automation** (20+ templates)
- **Marketing** (15+ templates)
- **E-commerce** (15+ templates)
- **Customer Support** (10+ templates)
- **Data Processing** (20+ templates)
- **DevOps** (10+ templates)
- **Finance** (10+ templates)
- **Social Media** (10+ templates)
- **Analytics** (10+ templates)
- **Productivity** (10+ templates)

---

## Example Templates

### Lead Qualification Pipeline
Automatically score and route leads based on criteria.

**Features:**
- Webhook trigger for incoming leads
- JavaScript-based scoring logic
- CRM integration (Salesforce)
- Slack notifications for qualified leads
- Email nurturing for unqualified leads

**Install:**
```bash
POST /api/templates/lead-qualification-pipeline/install
```

### Social Media Cross-Posting
Post content to Twitter, LinkedIn, Facebook simultaneously.

**Features:**
- Single content input
- Platform-specific formatting
- Parallel execution
- Error handling per platform

**Install:**
```bash
POST /api/templates/social-media-cross-posting/install
```

### Order Fulfillment Automation
Complete e-commerce order processing automation.

**Features:**
- Payment verification
- Inventory updates
- Shipping label creation
- Customer notifications
- Multi-step error handling

**Install:**
```bash
POST /api/templates/order-fulfillment-automation/install
```

---

## Configuration

### Environment Variables

```bash
# Required for AI features
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional

# Optional for better results
GOOGLE_AI_API_KEY=...
AZURE_OPENAI_KEY=...
```

### Service Configuration

```typescript
// Configure LLM service
const llmService = new LLMService();

await llmService.registerProvider({
  id: 'openai',
  name: 'OpenAI',
  type: 'openai',
  config: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1'
  },
  // ... other config
});
```

---

## Best Practices

### Template Selection

1. **Start with Featured Templates** - Vetted and most popular
2. **Filter by Difficulty** - Match your skill level
3. **Check Ratings** - Community feedback is valuable
4. **Review Documentation** - Understand setup requirements

### AI Workflow Generation

1. **Be Specific** - "Send email when order is placed" > "automation"
2. **Mention Integrations** - Include service names (Slack, Salesforce)
3. **Specify Triggers** - Webhook, schedule, email trigger
4. **Add Constraints** - Limit complexity if needed

### Workflow Optimization

1. **Run Regularly** - Optimize as workflows evolve
2. **Prioritize Critical Issues** - Security and reliability first
3. **Apply Auto-Fixes** - When available, for quick wins
4. **Monitor Impact** - Track performance after changes

---

## Troubleshooting

### Template Installation Fails

```typescript
// Check if template exists
const template = templateService.getById('template-id');
if (!template) {
  console.error('Template not found');
}

// Check required integrations
console.log('Required:', template.requiredIntegrations);

// Validate customizations
console.log('Customizable fields:', template.customizableFields);
```

### AI Generation Low Confidence

```typescript
const result = await generator.generateWorkflow({
  prompt: "your prompt",
  context: {
    // Add more context
    preferredServices: ['slack', 'email'],
    complexity: 'simple'
  }
});

if (result.confidence < 0.7) {
  // Try suggested templates instead
  console.log('Suggested templates:', result.suggestedTemplates);
}
```

### Optimization Suggestions Too Many

```typescript
const analysis = await optimizer.analyzeWorkflow(nodes, edges);

// Filter by severity
const criticalOnly = analysis.suggestions.filter(s =>
  s.severity === 'critical' || s.severity === 'high'
);

// Group by type
const byType = analysis.suggestions.reduce((acc, s) => {
  if (!acc[s.type]) acc[s.type] = [];
  acc[s.type].push(s);
  return acc;
}, {});
```

---

## Performance Tips

### Template Loading

```typescript
// Lazy load templates
const categories = templateService.getMarketplace({
  category: 'marketing' // Only load one category
});

// Limit results
const popular = templateService.getPopular(10); // Top 10 only
```

### AI Request Caching

```typescript
// Cache common patterns
const cache = new Map();

async function generateWithCache(prompt) {
  if (cache.has(prompt)) {
    return cache.get(prompt);
  }

  const result = await generator.generateWorkflow({ prompt });
  cache.set(prompt, result);
  return result;
}
```

### Optimization Batching

```typescript
// Batch analyze multiple workflows
const workflows = [...];
const analyses = await Promise.all(
  workflows.map(w => optimizer.analyzeWorkflow(w.nodes, w.edges))
);
```

---

## Support & Resources

- **Full Documentation:** `AGENT12_MARKETPLACE_AI_IMPLEMENTATION_REPORT.md`
- **Template Library:** `/src/templates/comprehensiveTemplateLibrary.ts`
- **AI Generator:** `/src/services/AIWorkflowGeneratorService.ts`
- **Optimizer:** `/src/services/WorkflowOptimizerService.ts`
- **API Routes:** `/src/backend/api/routes/templates.ts`

---

## Next Steps

1. **Explore Templates** - Browse the marketplace
2. **Try AI Generation** - Create a workflow from description
3. **Optimize Workflows** - Analyze existing workflows
4. **Contribute Templates** - Share your workflows
5. **Join Community** - Rate and review templates

---

**Version:** 1.0.0
**Last Updated:** October 18, 2025
**Status:** Production Ready
