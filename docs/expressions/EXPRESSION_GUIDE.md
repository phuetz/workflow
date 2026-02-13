# Expression System Guide

Complete guide to using expressions in the workflow automation platform.

## Table of Contents

1. [Introduction](#introduction)
2. [Basic Syntax](#basic-syntax)
3. [Context Variables](#context-variables)
4. [Built-in Functions](#built-in-functions)
5. [Advanced Examples](#advanced-examples)
6. [Security](#security)
7. [Best Practices](#best-practices)

## Introduction

The expression system allows you to dynamically compute values in your workflows using JavaScript-like syntax wrapped in `{{ }}` delimiters. This is fully compatible with n8n's expression system.

### Quick Example

```javascript
// Access data from previous node
{{ $json.email }}

// Transform data
{{ toUpperCase($json.name) }}

// Complex logic
{{ $json.items.filter(i => i.active).map(i => i.id) }}
```

## Basic Syntax

### Simple Expressions

Access properties from the current item:

```javascript
{{ $json.name }}
{{ $json.user.email }}
{{ $json.items[0] }}
```

### String Interpolation

Use template literals for complex strings:

```javascript
{{ `Hello ${$json.name}!` }}
{{ `Order #${$json.orderId} - ${$json.status}` }}
```

### Conditional Logic

Use ternary operators:

```javascript
{{ $json.active ? "Active" : "Inactive" }}
{{ $json.age >= 18 ? "Adult" : "Minor" }}
{{ $json.price > 100 ? $json.price * 0.9 : $json.price }}
```

### Arithmetic Operations

```javascript
{{ $json.price * 1.2 }}
{{ $json.total - $json.discount }}
{{ $json.quantity * $json.unitPrice }}
```

## Context Variables

### $json

Access the JSON data of the current item:

```javascript
{{ $json.email }}
{{ $json.user.profile.name }}
{{ $json.items.length }}
```

### $binary

Access binary data (files, images):

```javascript
{{ $binary.file.data }}
{{ $binary.image.mimeType }}
```

### $node(name)

Access data from a specific node:

```javascript
{{ $node("HTTP Request").json[0].id }}
{{ $node("Database").json[0].count }}
{{ $node("Webhook").json[0].body }}
```

Access first or last item from a node:

```javascript
{{ $node("HTTP Request").first().json.id }}
{{ $node("Database").last().json.total }}
```

### $item(index)

Access items by index:

```javascript
{{ $item(0).json.name }}    // First item
{{ $item(1).json.email }}   // Second item
{{ $item(-1).json.status }} // Last item
```

### $items

Access all items in the current execution:

```javascript
{{ $items.length }}
{{ $items[0].json.name }}
{{ $items.map(i => i.json.id) }}
```

### $workflow

Access workflow metadata:

```javascript
{{ $workflow.id }}
{{ $workflow.name }}
{{ $workflow.active }}
{{ $workflow.tags }}
```

### $execution

Access execution context:

```javascript
{{ $execution.id }}
{{ $execution.mode }}        // "manual", "trigger", "webhook", "scheduled"
{{ $execution.startedAt }}
```

### $env

Access environment variables:

```javascript
{{ $env.API_KEY }}
{{ $env.DATABASE_URL }}
{{ $env.ENVIRONMENT }}
```

### $now and $today

Access current date/time:

```javascript
{{ $now }}                    // Current date and time
{{ $now.toISOString() }}      // ISO format
{{ $today }}                  // Today at midnight
{{ getYear($now) }}           // Current year
```

### $uuid

Generate unique identifiers:

```javascript
{{ $uuid() }}                 // Generate new UUID
```

### Position Variables

Track position in items array:

```javascript
{{ $position }}               // Current position (0-based)
{{ $itemIndex }}              // Same as $position
{{ $first }}                  // true if first item
{{ $last }}                   // true if last item
{{ $runIndex }}               // Current run iteration
```

### $input

Helper for accessing input data:

```javascript
{{ $input.all() }}            // All items
{{ $input.first().json }}     // First item's JSON
{{ $input.last().json }}      // Last item's JSON
{{ $input.item.json }}        // Current item's JSON
```

## Built-in Functions

### String Functions

#### toLowerCase(str)
Convert string to lowercase.
```javascript
{{ toLowerCase($json.name) }}
// "JOHN" => "john"
```

#### toUpperCase(str)
Convert string to uppercase.
```javascript
{{ toUpperCase($json.name) }}
// "john" => "JOHN"
```

#### capitalize(str)
Capitalize first letter.
```javascript
{{ capitalize($json.name) }}
// "john doe" => "John doe"
```

#### trim(str)
Remove whitespace from both ends.
```javascript
{{ trim($json.name) }}
// "  john  " => "john"
```

#### split(str, separator)
Split string into array.
```javascript
{{ split($json.tags, ",") }}
// "red,green,blue" => ["red", "green", "blue"]
```

#### replace(str, search, replacement)
Replace text in string.
```javascript
{{ replace($json.text, "old", "new") }}
```

#### substring(str, start, end)
Extract substring.
```javascript
{{ substring($json.text, 0, 10) }}
```

#### includes(str, search)
Check if string contains substring.
```javascript
{{ includes($json.email, "@gmail.com") }}
```

#### startsWith(str, search)
Check if string starts with substring.
```javascript
{{ startsWith($json.url, "https://") }}
```

#### endsWith(str, search)
Check if string ends with substring.
```javascript
{{ endsWith($json.filename, ".pdf") }}
```

#### extractDomain(email)
Extract domain from email.
```javascript
{{ extractDomain($json.email) }}
// "user@example.com" => "example.com"
```

#### urlEncode(str)
URL encode a string.
```javascript
{{ urlEncode($json.query) }}
// "hello world" => "hello%20world"
```

#### base64Encode(str)
Encode string to base64.
```javascript
{{ base64Encode($json.data) }}
```

#### base64Decode(str)
Decode base64 string.
```javascript
{{ base64Decode($json.encoded) }}
```

### Date/Time Functions

#### toISOString(date)
Convert date to ISO 8601 string.
```javascript
{{ toISOString($now) }}
// "2024-01-15T10:30:00.000Z"
```

#### formatDate(date, locale)
Format date using locale.
```javascript
{{ formatDate($now, "en-US") }}
// "1/15/2024"
```

#### addDays(date, days)
Add days to a date.
```javascript
{{ addDays($now, 7) }}
// Date 7 days from now
```

#### addHours(date, hours)
Add hours to a date.
```javascript
{{ addHours($now, 2) }}
```

#### diffDays(date1, date2)
Calculate difference in days.
```javascript
{{ diffDays($json.startDate, $now) }}
```

#### getYear(date)
Get year from date.
```javascript
{{ getYear($now) }}
// 2024
```

#### getMonth(date)
Get month from date (1-12).
```javascript
{{ getMonth($now) }}
// 1-12
```

### Array Functions

#### length(arr)
Get array length.
```javascript
{{ length($items) }}
{{ length($json.tags) }}
```

#### first(arr)
Get first element.
```javascript
{{ first($items).json.name }}
```

#### last(arr)
Get last element.
```javascript
{{ last($items).json.status }}
```

#### unique(arr)
Get unique values.
```javascript
{{ unique($json.tags) }}
// [1, 2, 2, 3] => [1, 2, 3]
```

#### flatten(arr, depth)
Flatten nested array.
```javascript
{{ flatten($json.nested) }}
// [[1, 2], [3, 4]] => [1, 2, 3, 4]
```

#### chunk(arr, size)
Split array into chunks.
```javascript
{{ chunk($items, 10) }}
// Split into groups of 10
```

#### pluck(arr, key)
Extract property from array of objects.
```javascript
{{ pluck($items, "id") }}
// [{ id: 1 }, { id: 2 }] => [1, 2]
```

#### sum(arr)
Sum array of numbers.
```javascript
{{ sum($json.prices) }}
// [10, 20, 30] => 60
```

#### average(arr)
Calculate average.
```javascript
{{ average($json.scores) }}
// [80, 90, 100] => 90
```

#### min(arr) / max(arr)
Find minimum/maximum.
```javascript
{{ min($json.prices) }}
{{ max($json.scores) }}
```

#### sortAsc(arr) / sortDesc(arr)
Sort array.
```javascript
{{ sortAsc($json.numbers) }}
{{ sortDesc($json.scores) }}
```

### Object Functions

#### keys(obj)
Get object keys.
```javascript
{{ keys($json) }}
```

#### values(obj)
Get object values.
```javascript
{{ values($json) }}
```

#### entries(obj)
Get key-value pairs.
```javascript
{{ entries($json) }}
```

#### hasKey(obj, key)
Check if key exists.
```javascript
{{ hasKey($json, "email") }}
```

#### get(obj, path, defaultValue)
Get nested value safely.
```javascript
{{ get($json, "user.profile.name", "Unknown") }}
```

#### pick(obj, keys)
Pick specific keys.
```javascript
{{ pick($json, ["id", "name", "email"]) }}
```

#### omit(obj, keys)
Omit specific keys.
```javascript
{{ omit($json, ["password", "secret"]) }}
```

### Math Functions

#### round(num, decimals)
Round number.
```javascript
{{ round($json.price, 2) }}
// 3.14159 => 3.14
```

#### floor(num) / ceil(num)
Round down/up.
```javascript
{{ floor($json.value) }}
{{ ceil($json.value) }}
```

#### abs(num)
Absolute value.
```javascript
{{ abs($json.delta) }}
```

#### random(min, max)
Generate random number.
```javascript
{{ random(1, 100) }}
```

#### randomInt(min, max)
Generate random integer.
```javascript
{{ randomInt(1, 10) }}
```

### Conversion Functions

#### toString(value)
Convert to string.
```javascript
{{ toString($json.id) }}
```

#### toNumber(value)
Convert to number.
```javascript
{{ toNumber($json.count) }}
```

#### toBoolean(value)
Convert to boolean.
```javascript
{{ toBoolean($json.active) }}
```

#### parseJson(str)
Parse JSON string.
```javascript
{{ parseJson($json.data) }}
```

#### toJson(value, pretty)
Convert to JSON string.
```javascript
{{ toJson($json, true) }}
```

### Validation Functions

#### isString(value) / isNumber(value) / isBoolean(value)
Type checking.
```javascript
{{ isString($json.name) }}
{{ isNumber($json.age) }}
{{ isBoolean($json.active) }}
```

#### isArray(value) / isObject(value)
Structure checking.
```javascript
{{ isArray($json.items) }}
{{ isObject($json.data) }}
```

#### isEmpty(value)
Check if empty.
```javascript
{{ isEmpty($json.name) }}
```

#### isEmail(value)
Validate email.
```javascript
{{ isEmail($json.email) }}
```

#### isUrl(value)
Validate URL.
```javascript
{{ isUrl($json.website) }}
```

## Advanced Examples

### Data Transformation

Filter and map items:
```javascript
{{ $items.filter(i => i.json.active).map(i => i.json.email) }}
```

Calculate total:
```javascript
{{ sum($items.map(i => i.json.price)) }}
```

Group by status:
```javascript
{{ $items.filter(i => i.json.status === "completed").length }}
```

### Conditional Output

```javascript
{{ $json.score >= 90 ? "A" : $json.score >= 80 ? "B" : "C" }}
```

### String Building

```javascript
{{ `${$json.firstName} ${$json.lastName} <${$json.email}>` }}
```

### Date Calculations

Days until deadline:
```javascript
{{ diffDays($now, new Date($json.deadline)) }}
```

Format timestamp:
```javascript
{{ formatDate(new Date($json.createdAt), "en-US") }}
```

### Complex Filters

Find specific items:
```javascript
{{ $node("Database").json.find(item => item.id === $json.userId) }}
```

Filter and sort:
```javascript
{{ $items.filter(i => i.json.price > 100).sort((a, b) => b.json.price - a.json.price) }}
```

### Error Handling

Provide defaults:
```javascript
{{ get($json, "user.email", "no-email@example.com") }}
```

Safe array access:
```javascript
{{ $json.items && $json.items.length > 0 ? $json.items[0] : null }}
```

## Security

### Sandboxed Execution

All expressions run in a secure sandbox with:
- No access to `require()`, `import`, or `process`
- No file system access
- No network access
- Timeout protection (5 seconds default)
- Memory limits
- Iteration limits (10,000 default)

### Forbidden Operations

These operations are blocked:
- `require("module")`
- `process.env`
- `eval()`
- `Function()` constructor
- `__dirname`, `__filename`
- Prototype pollution attempts

### Best Practices

1. **Always validate external data**
   ```javascript
   {{ isEmail($json.email) ? $json.email : "invalid" }}
   ```

2. **Use safe property access**
   ```javascript
   {{ get($json, "deeply.nested.property", defaultValue) }}
   ```

3. **Limit iterations**
   ```javascript
   // Good - limited slice
   {{ $items.slice(0, 100).map(i => i.json.id) }}

   // Avoid - unbounded iteration
   {{ $items.map(i => i.json.id) }} // if $items is huge
   ```

4. **Handle missing data**
   ```javascript
   {{ $json.name || "Unknown" }}
   {{ $json.items?.length || 0 }}
   ```

## Performance Tips

1. **Cache repeated calculations**
   ```javascript
   // Instead of calculating twice
   {{ $items.filter(i => i.json.active).length > 0 ? $items.filter(i => i.json.active) : [] }}

   // Use a variable approach in your node logic
   ```

2. **Use built-in functions**
   ```javascript
   // Preferred
   {{ pluck($items, "id") }}

   // Works but slower
   {{ $items.map(i => i.json.id) }}
   ```

3. **Avoid nested loops**
   ```javascript
   // Good
   {{ $items.map(i => i.json.value) }}

   // Avoid
   {{ $items.map(i => $items.map(j => i.json.id + j.json.id)) }}
   ```

## Debugging

### Test Expressions

Use the expression editor's test panel to evaluate expressions with sample data before using them in your workflow.

### Common Errors

**"Cannot read property of undefined"**
- Use optional chaining or safe access:
  ```javascript
  {{ get($json, "user.email", "default") }}
  ```

**"Maximum iterations exceeded"**
- Reduce array size or use slice:
  ```javascript
  {{ $items.slice(0, 1000).map(i => i.json.id) }}
  ```

**"Expression timeout"**
- Simplify complex expressions
- Avoid infinite loops
- Process large datasets in batches

## Migration from Other Systems

### From n8n

The expression system is fully compatible with n8n. All n8n expressions should work without modification.

### From Zapier

| Zapier | Our Platform |
|--------|-------------|
| `{{field}}` | `{{ $json.field }}` |
| `{{field__value}}` | `{{ $json.field.value }}` |
| N/A | Rich functions available |

### From Make/Integromat

| Make | Our Platform |
|------|-------------|
| `{{field}}` | `{{ $json.field }}` |
| `{{toUpperCase(field)}}` | `{{ toUpperCase($json.field) }}` |

## Additional Resources

- [API Documentation](../api/README.md)
- [Workflow Examples](../examples/README.md)
- [Built-in Functions Reference](./FUNCTIONS.md)
- [Security Guide](./SECURITY.md)

## Support

For issues or questions:
- Check the [FAQ](./FAQ.md)
- Review [Common Patterns](./PATTERNS.md)
- Contact support

---

**Version:** 1.0.0
**Last Updated:** 2025-01-15
