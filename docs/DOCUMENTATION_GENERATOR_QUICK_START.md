# Visual Documentation Generator - Quick Start

## 30-Second Start

```typescript
import { DocumentationGenerator } from './documentation/DocumentationGenerator';

const generator = new DocumentationGenerator();
const config = DocumentationGenerator.getDefaultConfig();

const doc = await generator.generate(
  'my-workflow',
  nodes,
  edges,
  config,
  { name: 'My Workflow', version: '1.0.0' }
);

console.log(doc.content); // Markdown documentation
```

## Common Use Cases

### 1. Generate Markdown for GitHub

```typescript
const doc = await generator.generate(
  workflowId,
  nodes,
  edges,
  {
    ...DocumentationGenerator.getDefaultConfig(),
    format: 'markdown',
    embedDiagrams: true
  }
);

fs.writeFileSync('README.md', doc.content);
```

### 2. Generate API Documentation (OpenAPI)

```typescript
const analysis = await generator.analyze(workflowId, nodes, edges);
const openapi = await generator.export(analysis, 'openapi');

fs.writeFileSync('openapi.yaml', openapi);
```

### 3. Generate JSON for Programmatic Access

```typescript
const analysis = await generator.analyze(workflowId, nodes, edges);
const json = await generator.export(analysis, 'json');

const data = JSON.parse(json);
console.log(data.workflow.nodes.length); // Access programmatically
```

### 4. Generate HTML for Web Documentation

```typescript
const doc = await generator.generate(
  workflowId,
  nodes,
  edges,
  {
    ...DocumentationGenerator.getDefaultConfig(),
    format: 'html',
    embedDiagrams: true
  }
);

fs.writeFileSync('docs/workflow.html', doc.content);
```

### 5. Track Progress

```typescript
const generator = new DocumentationGenerator();

generator.onProgress('my-task', (progress) => {
  console.log(`${progress.status}: ${progress.progress}%`);
});

const doc = await generator.generate(...);
```

## Configuration Options

### Minimal Documentation

```typescript
{
  format: 'markdown',
  includeNodeDetails: false,
  includeVariables: false,
  includeExamples: false,
  includeAPISpecs: false,
  embedDiagrams: true,
  template: 'minimal'
}
```

### Complete Documentation

```typescript
{
  format: 'markdown',
  includeNodeDetails: true,
  includeVariables: true,
  includeExamples: true,
  includeAPISpecs: true,
  includeVersionHistory: true,
  embedDiagrams: true,
  template: 'detailed'
}
```

### API-Focused Documentation

```typescript
{
  format: 'openapi',
  includeAPISpecs: true,
  includeExamples: true
}
```

## Available Formats

| Format | Use Case | Output Extension |
|--------|----------|------------------|
| `markdown` | GitHub/GitLab docs | `.md` |
| `html` | Static websites | `.html` |
| `json` | Programmatic access | `.json` |
| `openapi` | API documentation | `.yaml` |
| `pdf` | Printable reports | `.pdf` |

## Diagram Layouts

| Layout | Description |
|--------|-------------|
| `auto` | Automatic layout (recommended) |
| `horizontal` | Left to right (LR) |
| `vertical` | Top to bottom (TB) |
| `hierarchical` | Tree structure |

## Color Schemes

| Scheme | Description |
|--------|-------------|
| `category` | Color by node category (default) |
| `status` | Color by execution status |
| `default` | Uniform colors |

## Performance Tips

1. **Use Minimal Template for Previews**
   ```typescript
   config.template = 'minimal';
   ```

2. **Disable Examples for Large Workflows**
   ```typescript
   config.includeExamples = false;
   ```

3. **Cache Analysis Results**
   ```typescript
   const analysis = await generator.analyze(...);
   const markdown = await generator.export(analysis, 'markdown');
   const json = await generator.export(analysis, 'json');
   ```

4. **Batch Generation**
   ```typescript
   await Promise.all(
     workflows.map(w => generator.generate(...))
   );
   ```

## Troubleshooting

### Documentation Generation Too Slow
- Use minimal template
- Disable examples and details
- Reduce node count

### Diagrams Not Rendering
- Set `embedDiagrams: true`
- Check Mermaid syntax
- Ensure format supports diagrams

### Missing Node Details
- Set `includeNodeDetails: true`
- Ensure nodes have config data

### Variables Not Detected
- Use `{{variableName}}` or `${variableName}` syntax
- Variables must be in node config strings

## Quick Reference

### Generate Documentation

```typescript
generator.generate(workflowId, nodes, edges, config, metadata?)
```

### Analyze Only

```typescript
generator.analyze(workflowId, nodes, edges, metadata?)
```

### Export Format

```typescript
generator.export(analysis, format, config?)
```

### Estimate Time

```typescript
generator.estimateGenerationTime(nodeCount, format)
```

### Get Default Config

```typescript
DocumentationGenerator.getDefaultConfig()
```

## Examples

See:
- `DOCUMENTATION_GENERATOR_GUIDE.md` - Complete guide
- `docs/examples/sample-workflow-documentation.md` - Example output
- `src/__tests__/documentationGenerator.test.ts` - Test examples

## Support

- GitHub Issues: [Report bugs]
- Documentation: `DOCUMENTATION_GENERATOR_GUIDE.md`
- Tests: `src/__tests__/documentationGenerator.test.ts`

---

**Visual Documentation Generator v1.0.0**
