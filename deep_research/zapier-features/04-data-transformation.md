# Data Transformation Capabilities

## Overview

Zapier provides extensive data transformation capabilities through the Formatter tool and related utilities, allowing users to reshape, clean, and convert data between different formats without coding.

## Formatter by Zapier

### Core Categories

#### 1. Text Transformations

| Function | Description |
|----------|-------------|
| Capitalize | Capitalize first letter of each word |
| Titlecase | Apply title case rules |
| Lowercase | Convert all text to lowercase |
| Uppercase | Convert all text to uppercase |
| Trim Whitespace | Remove extra spaces at beginning/end |
| Split Text | Split content at specified separator |
| Find & Replace | Find and replace text patterns |
| Truncate | Cut text to specified length |
| Default Value | Return fallback if text is empty |

#### 2. Text Extraction

| Function | Description |
|----------|-------------|
| Extract Number | Find and extract numbers from text |
| Extract Email | Find first email address in text |
| Extract URL | Find first URL in text |
| Extract Pattern | Find regex matches with groups |
| Length | Count characters in text |
| Word Count | Count words in text |

#### 3. Text Conversion

| Function | Description |
|----------|-------------|
| URL Encode | Encode text for use in URLs |
| URL Decode | Decode URL-encoded text |
| Convert Markdown to HTML | Full GitHub-style Markdown support |
| Convert to ASCII | Replace special characters with normal |
| Remove HTML Tags | Strip HTML from text |

#### 4. Number Transformations

| Function | Description |
|----------|-------------|
| Format Number | Apply currency, decimal formatting |
| Math Operations | Perform calculations |
| Spreadsheet Formulas | Use Excel-like formulas |
| Random Number | Generate random numbers |

#### 5. Date/Time Transformations

| Function | Description |
|----------|-------------|
| Format Date/Time | Convert to different formats |
| Add/Subtract Time | Modify dates by specified amount |
| Compare Dates | Check date relationships |
| Convert Time Zone | Change between time zones |
| Date Difference | Calculate time between dates |

**Time Units Supported:**
- Years
- Months
- Weeks
- Days
- Hours
- Minutes
- Seconds

#### 6. Utility Functions

| Function | Description |
|----------|-------------|
| Pick from List | Choose item from comma-separated list |
| Lookup Table | Key-value translation table |
| Line-item to Text | Flatten line items (arrays) to text |
| Text to Line-item | Convert text to line items |
| Line Itemizer | Convert/combine multiple fields to line items |
| Import CSV | Parse CSV files as line items |

## Line Items and Arrays

### What Are Line Items?
- Groups of similar values (like multiple orders or contacts)
- Zapier's way of handling arrays and lists
- Essential for processing bulk data

### Working with Line Items

1. **Create from Text**: Split comma-separated or newline-separated text
2. **Create from Loop**: Generate through Looping by Zapier
3. **Flatten to Text**: Convert back to string for single-value fields
4. **Aggregate**: Combine multiple items into summary

### Common Operations
- Map over items (transform each)
- Filter items (select matching)
- Aggregate items (sum, count, join)
- Split items (divide by condition)

## Code by Zapier

### JavaScript Support
- Run custom JavaScript code
- Access to input data from previous steps
- Return structured output for later steps
- Modern JavaScript (ES6+) supported

### Python Support
- Run custom Python code
- Same input/output model as JavaScript
- Access to standard library

### Use Cases
- Complex data transformations beyond Formatter
- Custom calculations and logic
- API response parsing
- Data validation and cleaning

## AI-Powered Transformations

### AI Integration in Formatter
- Describe transformations in natural language
- Zapier suggests appropriate Formatter steps
- Automatic field mapping suggestions

### AI Fields in Tables
- Create fields that use AI to generate content
- Write emails based on existing data
- Generate summaries, translations, etc.

## Data Mapping Features

### Field Mapping
- Visual interface for connecting fields
- Support for nested data (JSON paths)
- Default values for missing data

### Data Type Handling
- Automatic type conversion when possible
- Explicit formatting for dates and numbers
- Null/empty value handling

## Expression Syntax

### Accessing Data
- Reference previous step outputs
- Access nested properties
- Handle arrays and objects

### Built-in Variables
- Step references
- Account information
- Zap metadata

## Best Practices

1. **Use Formatter for standard transformations** - avoid Code unless necessary
2. **Handle empty values** - use Default Value to prevent errors
3. **Validate data early** - place transformations after trigger
4. **Test with edge cases** - check empty, null, and unexpected inputs
5. **Document complex transformations** - add notes for maintenance

## Competitive Features Summary

| Feature | Zapier Capability |
|---------|-------------------|
| Text transforms | 15+ built-in functions |
| Date handling | Full timezone and format support |
| Number formatting | Currency, decimals, math |
| Regex support | Extract Pattern with groups |
| Custom code | JavaScript and Python |
| AI assistance | Natural language to formatter |
| Line items | Full array manipulation |
| Lookup tables | Key-value mapping |

## Sources

- [Zapier Formatter: Automatically format text the way you want](https://zapier.com/blog/zapier-formatter-guide/)
- [Get started with Formatter - Zapier](https://help.zapier.com/hc/en-us/articles/8496212590093-Get-started-with-Formatter)
- [Different field types in Zapier Tables](https://help.zapier.com/hc/en-us/articles/9775472454157-Different-field-types-in-Zapier-Tables)
