# Conversational Workflow Editor - User Guide

## Introduction

The Conversational Workflow Editor allows you to build, modify, and debug workflows using natural language. Simply describe what you want in plain English, and the AI assistant will help you accomplish your goals.

## Getting Started

### Opening the Chat Interface

Click the 💬 icon in the top-right corner of the workflow editor, or press `Cmd/Ctrl + K` to open the conversational interface.

### Your First Conversation

```
You: Add an HTTP request node
Assistant: I'll add an HTTP Request node to your workflow. 
           Where should I place it, or should I add it at the end?
You: At the end
Assistant: ✓ Added HTTP Request node at position (450, 200)
```

## Common Tasks

### Adding Nodes

```
"Add an email node"
"Create a database query"
"Insert a filter"
"New HTTP request node"
```

### Removing Nodes

```
"Remove node 5"
"Delete the email step"
"Get rid of the filter"
```

### Connecting Nodes

```
"Connect the API to the database"
"Link node 2 to node 5"
"Send data from HTTP to email"
```

### Configuration

```
"Configure the webhook with URL https://example.com"
"Set the email to use Gmail"
"Update the delay to 5 seconds"
"Change schedule to daily at 9am"
```

### Optimization

```
"Make this workflow faster"
"Optimize performance"
"Reduce costs"
"Add error handling"
```

### Debugging

```
"Why did this fail?"
"Debug node 5"
"What went wrong with the API call?"
"Show me the error"
```

### Explanations

```
"Explain this workflow"
"What does node 3 do?"
"How does this work?"
"Walk me through this"
```

## Advanced Features

### Multi-step Conversations

The assistant remembers context within a session:

```
You: Add a database node
Assistant: Added PostgreSQL node. What should it query?
You: User table
Assistant: ✓ Configured to query users table
You: Add a filter after it
Assistant: ✓ Added filter node connected to database
```

### Suggestions

The assistant proactively suggests improvements:

```
Assistant: 💡 I noticed you have 5 HTTP requests without rate limiting.
           Would you like me to add a rate limiter?
You: Yes
Assistant: ✓ Added rate limiter (max 100 req/min)
```

### Undo/Redo

```
You: Add a slack node
Assistant: ✓ Added Slack notification node
You: Actually, undo that
Assistant: ✓ Undid: Add Slack notification node
```

## Tips & Best Practices

### Be Specific

❌ "Add a node"
✅ "Add an HTTP request node"

### Use Natural Language

✅ "Make this faster"
✅ "Add error handling"
✅ "Send to Slack instead of email"

### Ask for Help

```
"What can you do?"
"How do I add a schedule?"
"Show me some examples"
```

### Check Before Applying

The assistant asks for confirmation on destructive operations:

```
Assistant: I'll remove 3 nodes and 5 connections. Continue?
You: Yes / No / Show me which ones
```

## Keyboard Shortcuts

- `Cmd/Ctrl + K` - Open chat
- `Cmd/Ctrl + Z` - Undo last change
- `Cmd/Ctrl + Shift + Z` - Redo
- `Esc` - Close chat

## Troubleshooting

### "I don't understand"

Try rephrasing your request:
- Be more specific
- Use common terms
- Break into smaller steps

### Changes Not Applied

Make sure to:
- Confirm when asked
- Check for validation errors
- Verify you have permissions

### Slow Response

- Check your internet connection
- Try simpler queries
- Clear conversation history

## Examples by Category

### Email Automation

```
"Add a webhook trigger"
"Filter emails from support@"
"Send to Gmail with template"
"Add retry if email fails"
```

### API Integration

```
"Add HTTP GET to api.example.com"
"Parse the JSON response"
"Transform data for next step"
"Add error handling for rate limits"
```

### Data Processing

```
"Add a filter for age > 21"
"Transform user objects"
"Merge data from both sources"
"Split into batches of 100"
```

### Scheduling

```
"Run every day at 9am"
"Execute every hour"
"Schedule for Monday mornings"
"Add a delay of 5 seconds"
```

## Support

- Press `?` in chat for quick help
- Type "examples" to see common commands
- Type "help" for detailed assistance

---

**Pro Tip**: The more you use the conversational interface, the better it understands your preferences and workflow patterns!
