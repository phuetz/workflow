# Sub-workflows and Workflow Calling

## Overview

n8n allows calling one workflow from another, enabling modular, microservice-like architectures. This is especially useful for large workflows that might encounter memory issues.

## Key Components

### Execute Sub-workflow Node

Used in the parent workflow to call child workflows:

- **Database Mode** - Select workflow by ID from n8n database
- **URL Mode** - Target workflow by URL
- **Parameter Mode** - Add workflow JSON as a parameter
- **File Mode** - Load workflow from local file

### Execute Sub-workflow Trigger Node

Used in the child workflow (also titled "When Executed by Another Workflow"):

- Receives data from parent workflow
- Configures input data handling
- Returns output to parent workflow

## Data Flow Between Workflows

### Execution Flow

1. Parent workflow reaches Execute Sub-workflow node
2. Data passes to Execute Sub-workflow Trigger in child workflow
3. Child workflow processes data through its nodes
4. Last node of child workflow returns data to parent
5. Parent workflow continues with returned data

### Input Data Modes

- **Pass Through** - All data from parent passed to child
- **Define Below** - Specify exactly what data to pass
- **Expressions** - Use expressions to construct input data

## Execution Options

### Run Mode

- **Run Once with All Items** - Pass all input items in single execution
- **Run Once for Each Item** - Execute child workflow per input item

### Wait for Completion

- **Enabled** - Parent waits for child to complete before continuing
- **Disabled** - Parent continues without waiting (fire-and-forget)

## Creating Sub-workflows

### Method 1: From Existing Workflow

1. Add Execute Sub-workflow node
2. Select Database and From list options
3. Choose existing workflow or "Create a sub-workflow"

### Method 2: Extract from Current Workflow

1. Select nodes to extract
2. Right-click and select "Sub-workflow conversion"
3. Selected nodes become new sub-workflow
4. Execute Sub-workflow node replaces selected nodes

## Nested Loops with Sub-workflows

### The Problem

n8n's Loop node doesn't work like traditional programming loops in nested contexts:
- Inner loop executes only once on initial data
- Loop doesn't "reset" for each outer loop item
- Common point of confusion for new users

### The Solution

Use sub-workflows to create new execution contexts:

```
Parent Workflow:
  [Loop Through Items] -> [Execute Sub-workflow]
                              |
                              v
                        Child Workflow:
                          [Loop Through Sub-items]
```

Each sub-workflow invocation creates a fresh execution context, allowing proper nested loop behavior.

## Best Practices

### Design Principles

1. **Single Responsibility** - Each sub-workflow should have one clear purpose
2. **Reusability** - Design sub-workflows for use across multiple parent workflows
3. **Error Handling** - Implement robust error handling at both levels
4. **Documentation** - Clear naming and documentation for team understanding

### Performance Considerations

- Sub-workflow executions don't count toward monthly execution limits
- Don't count toward active workflow limits
- Consider memory usage for deeply nested workflows
- Use "Run Once for Each Item" sparingly for large datasets

### Naming Conventions

Suggested naming patterns:
- `[SUB] Calculate Totals`
- `shared/process-customer-data`
- `module_email_sender`

## Use Cases

### 1. Reusable Business Logic

```
Main Workflow A -> [Execute Sub-workflow: Process Payment]
Main Workflow B -> [Execute Sub-workflow: Process Payment]
Main Workflow C -> [Execute Sub-workflow: Process Payment]
```

### 2. Microservices Architecture

```
Order Workflow
  -> [Sub] Validate Order
  -> [Sub] Check Inventory
  -> [Sub] Process Payment
  -> [Sub] Send Confirmation
```

### 3. Complex Data Processing

```
ETL Workflow
  -> [Sub] Extract from Source A
  -> [Sub] Extract from Source B
  -> [Sub] Transform Data
  -> [Sub] Load to Destination
```

### 4. Error Isolation

Errors in sub-workflows can be caught and handled without affecting the entire parent workflow.

## AI Integration

### Call n8n Workflow Tool

For AI Agent nodes, n8n provides a special node to call workflows as tools:

- AI agent can invoke n8n workflows
- Workflows become "tools" for the AI
- Enables AI-driven workflow orchestration

## Limitations

- Deeply nested sub-workflows may impact performance
- Debugging can be more complex across workflow boundaries
- Requires careful credential management across workflows

## Sources

- [Execute Sub-workflow Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/)
- [Sub-workflows Guide](https://docs.n8n.io/flow-logic/subworkflows/)
- [Execute Sub-workflow Trigger Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflowtrigger/)
- [Nested Loops with Sub-workflows](https://n8nplaybook.com/post/2025/07/how-to-handle-nested-loops-in-n8n-with-sub-workflows/)
- [Call n8n Workflow Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/)
