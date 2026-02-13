# Expression System and Data Transformation

## Overview

n8n's expression system provides powerful data transformation capabilities through a combination of JavaScript, built-in functions, and specialized libraries. Expressions use the `{{ }}` syntax for dynamic parameter values.

## Built-in Libraries

### Luxon
- Working with dates and time
- Date formatting and manipulation
- Timezone handling
- Duration calculations

### JMESPath
- Querying JSON data
- Complex object path extraction
- Filtering and projections

## Expression Syntax

### Basic Usage
```javascript
{{ $json.fieldName }}
{{ $node["Previous Node"].json.data }}
{{ $now.format('YYYY-MM-DD') }}
```

### Advanced Features
- Standard JavaScript string, array, and object methods
- n8n's custom data transformation functions
- IIFE (Immediately Invoked Function Expression) for complex logic
- Optional chaining and nullish coalescing for error handling

## Data Type-Specific Functions

### String Functions
- `base64Encode()` - Encode string as base64
- `base64Decode()` - Decode base64 to string
- `extractDomain()` - Extract domain from URL
- String manipulation (trim, split, replace, etc.)

### Object Functions
- `isEmpty()` - Check if object has no key-value pairs
- `merge()` - Merge two objects (base object takes precedence)
- Key/value extraction and manipulation

### Array Functions
- `isEmpty()` - Check if array has no elements
- `isNotEmpty()` - Check if array has elements
- `last()` - Return last element
- `max()` / `min()` - Return highest/lowest values
- `compact()` - Remove empty values
- `difference()` - Compare arrays, return non-matching elements
- Array filtering and mapping

### Number Functions
- `isEven()` - Check if number is even (whole numbers)
- `isOdd()` - Check if number is odd (whole numbers)
- `round()` - Round to nearest whole number or decimal places
- Mathematical operations

### Date Functions
- `beginningOf()` - Transform date to start of time period
- `endOf()` - Transform date to end of time period
- Date arithmetic and comparison
- Format conversion between JavaScript Date and Luxon Date

## Accessing Data from Other Nodes

### Node Reference Syntax
```javascript
// Access specific node's output
{{ $('NodeName').json.fieldName }}

// Access all items from a node
{{ $('NodeName').all() }}

// Access first/last item
{{ $('NodeName').first() }}
{{ $('NodeName').last() }}
```

### Context Variables
- `$json` - Current node's input data
- `$input` - All input data to current node
- `$node` - Access any previous node's data
- `$env` - Environment variables
- `$workflow` - Workflow metadata
- `$now` - Current timestamp
- `$today` - Current date
- `$execution` - Execution metadata

## Data Transformation Nodes

### Aggregate Node
- Take separate items or portions and group together
- Combine multiple data streams
- Statistical aggregations

### Limit Node
- Remove items beyond defined maximum
- Pagination support
- Data sampling

### Set Node
- Define and modify fields
- Rename fields
- Add computed values

### Edit Fields Node
- Bulk field editing
- Field mapping
- Data restructuring

## Error Handling in Expressions

### Optional Chaining
```javascript
{{ $json.user?.address?.city }}
```
- Prevents errors on undefined properties
- Returns undefined instead of throwing errors

### Nullish Coalescing
```javascript
{{ $json.value ?? 'default' }}
```
- Provide fallback values for null/undefined

### Combined Usage
```javascript
{{ $json.user?.name ?? 'Unknown User' }}
```

## Best Practices

1. **Use Optional Chaining** - Always handle potentially undefined paths
2. **Leverage Built-in Functions** - Prefer n8n functions over raw JavaScript when available
3. **Test Expressions** - Use the expression editor's preview feature
4. **Keep Expressions Simple** - Break complex logic into multiple nodes when needed
5. **Document Complex Expressions** - Add notes explaining non-obvious transformations

## Sources

- [Data Transformation Functions](https://docs.n8n.io/code/builtin/data-transformation-functions/)
- [Expressions Documentation](https://docs.n8n.io/code/expressions/)
- [String Functions](https://docs.n8n.io/code/builtin/data-transformation-functions/strings/)
- [Array Functions](https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/)
- [n8n Expressions Cheatsheet](https://logicworkflow.com/blog/n8n-expressions/)
