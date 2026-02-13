# AI Capabilities

## AI Agents Overview

### What are AI Agents in n8n?

AI Agents are autonomous workflows powered by AI that can:
- Make decisions without constant human input
- Interact with applications and services
- Execute tasks autonomously
- Reason through tasks step-by-step
- Use memory, goals, and tools

### Key Differentiator

Unlike standard "if-this-then-that" automation:
- AI agents make context-aware decisions
- Adapt to new situations
- Autonomously achieve goals
- Learn from execution results

## LLM Integrations

### Cloud Providers

| Provider | Models | Node Type |
|----------|--------|-----------|
| OpenAI | GPT-4, GPT-3.5, DALL-E, Whisper | Native |
| Anthropic | Claude 3, Claude 2 | Native |
| Google | Gemini, PaLM | Native |
| Azure OpenAI | GPT-4, GPT-3.5 | Native |
| AWS Bedrock | Various models | Native |
| Cohere | Command, Embed | Native |
| Hugging Face | Open models | Native |

### Local Models

- Ollama - Run LLMs locally
- vLLM - High-performance serving
- Custom endpoints via HTTP Request

### Multi-Vendor Support

- OpenRouter for model routing
- Unified interface for multiple providers
- Easy model switching
- Cost optimization through routing

## AI Node Types

### 1. Chat Model Nodes

- OpenAI Chat Model
- Anthropic Chat Model
- Google AI Chat Model
- Azure OpenAI Chat Model
- Ollama Chat Model

### 2. AI Agent Node

Core autonomous agent capabilities:
- Tool usage
- Memory integration
- Multi-step reasoning
- Goal-oriented execution

### 3. Tool Nodes

Connect AI agents to:
- Web search
- Database queries
- API calls
- File operations
- n8n workflows (as tools)

### 4. Memory Nodes

- Buffer Memory (short-term)
- Vector Store Memory (semantic)
- Window Buffer Memory
- Conversation summary

### 5. Embedding Nodes

- OpenAI Embeddings
- Cohere Embeddings
- Google Embeddings
- Local embedding models

### 6. Vector Store Nodes

- Pinecone
- Weaviate
- Qdrant
- Chroma
- Supabase Vector

## Building AI Agents

### Anthropic's Composable Patterns

n8n supports building agents using Anthropic's research patterns:

1. **Prompt Chaining** - Sequential AI calls
2. **Routing** - Dynamic path selection
3. **Parallelization** - Concurrent AI operations
4. **Orchestrator Workers** - Manager-worker patterns
5. **Evaluator Optimizer** - Self-improving agents

### Agent Architecture

```
[Trigger] -> [AI Agent] -> [Tool 1]
                       -> [Tool 2]
                       -> [Tool 3]
                       -> [Output]
```

### Agent Configuration

- Define agent goals
- Assign available tools
- Configure memory type
- Set guardrails and limits
- Add human-in-the-loop checkpoints

## Production Features

### Reliability

- Mix deterministic steps with AI
- Fallback logic for AI failures
- Error handling and recovery
- Input validation

### Guardrails

- Content filtering
- Output validation
- Rate limiting
- Cost controls

### Human-in-the-Loop

- Approval steps for critical decisions
- Review before AI execution
- Manual override capabilities
- Audit trail

### Monitoring

- Execution logging
- Performance metrics
- Cost tracking
- Error monitoring

## Model Context Protocol (MCP)

### Overview

n8n supports Anthropic's Model Context Protocol:
- Standardized AI-tool communication
- Connect AI models to data sources
- Portable tool definitions
- Cross-platform compatibility

### MCP Server

- Call n8n workflows from other AI systems
- Expose workflows as MCP tools
- Bidirectional integration

## Accessibility

### No-Code AI

- Drag-and-drop AI workflow building
- Pre-built AI templates
- Visual agent configuration
- No programming required

### Code When Needed

- JavaScript/Python for custom logic
- Expression-based AI outputs
- Custom model integrations
- Advanced transformations

## AI Workflow Examples

### 1. Customer Support Agent

```
[Webhook] -> [AI Agent: Classify] -> [Route] -> [Response]
                                  -> [Database Query]
                                  -> [Email Send]
```

### 2. Content Generation Pipeline

```
[Schedule] -> [AI: Generate] -> [AI: Review] -> [Publish]
```

### 3. Data Analysis Agent

```
[Trigger] -> [Fetch Data] -> [AI: Analyze] -> [Report] -> [Notify]
```

### 4. RAG (Retrieval Augmented Generation)

```
[Query] -> [Vector Search] -> [AI: Generate with Context] -> [Response]
```

## Best Practices

### 1. Define Clear Agent Goals

- Specific, measurable objectives
- Bounded scope of operation
- Clear success criteria

### 2. Implement Error Handling

- Fallback responses
- Retry logic for transient failures
- Graceful degradation

### 3. Use Appropriate Memory

- Short-term for conversations
- Long-term for learning
- Vector stores for semantic retrieval

### 4. Monitor and Iterate

- Track performance metrics
- Analyze failure patterns
- Continuously improve prompts

### 5. Security Considerations

- Limit tool permissions
- Validate AI outputs
- Audit sensitive operations

## Sources

- [AI Agent Integrations](https://n8n.io/integrations/agent/)
- [Anthropic Integrations](https://n8n.io/integrations/anthropic/)
- [n8n AI Agents Guide](https://www.nocodefinder.com/blog-posts/n8n-agents-guide-ai-workflow-automation)
- [Best AI Agents - n8n Blog](https://blog.n8n.io/best-ai-agents/)
- [Build Custom AI Agents](https://n8n.io/ai-agents/)
- [Enterprise AI Agent Tools](https://n8n.io/reports/ai-agent-development-tools/)
