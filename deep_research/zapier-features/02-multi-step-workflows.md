# Multi-Step Workflows: Paths, Filters, and Formatters

## Overview

Multi-step Zaps allow chaining multiple actions in a single workflow with advanced logic capabilities including filters, formatters, and conditional paths.

## Paths (Conditional Branching)

### What Are Paths?
- Paths let you build advanced workflows with if/then logic
- If condition A is met, perform action X; if condition B, perform action Y
- Allows handling complex scenarios within a single Zap

### Path Capabilities
- **Up to 10 path branches** per path group
- **Nested paths**: Maximum of 3 levels of nesting
- Each branch can have its own set of actions
- One, some, all, or none of the branches can run based on conditions

### Execution Modes
- **Sequential execution** (default since June 2025): Branches evaluated left to right in order
- **Parallel execution** (legacy): All branches evaluated simultaneously
- As of September 2025, sequential execution is the only option for new paths

### Availability
- Available on Professional plans and higher

## Filters

### What Are Filters?
- Filters control whether a Zap continues based on conditions
- If conditions are met, the Zap continues; otherwise, it stops
- Can be added at any point after the trigger

### Filter Capabilities
- Single set of conditions per filter step
- Multiple filters can be used in the same Zap
- Use for linear workflows where only one outcome path is needed
- Best practice: Place filters early to trim noise and prevent unnecessary tasks

### Filter vs Paths
| Feature | Filter | Paths |
|---------|--------|-------|
| Purpose | Continue or stop | Branch to different actions |
| Conditions | Single set | Multiple sets |
| Outcomes | Binary (continue/stop) | Multiple branches |
| Use case | Linear workflows | Complex conditional logic |

## Formatters

### What Are Formatters?
- Built-in tool for transforming text, numbers, dates, and data
- Cleans and reshapes data before sending to destination apps
- Four main action categories: Text, Numbers, Date/Time, Utility

### Text Transformations
- **Case changes**: Capitalize, Titlecase, Lowercase, Uppercase
- **Extraction**: Extract Number, Extract Email, Extract URL, Extract Pattern (regex)
- **Manipulation**: Split Text, Trim Whitespace, Find & Replace
- **Conversion**: Convert Markdown to HTML, URL Encode/Decode, Convert to ASCII
- **Analysis**: Length (character count), Word Count
- **Other**: Default Value, Truncate, Remove HTML tags

### Number Transformations
- Format numbers (currency, decimals)
- Perform math operations
- Spreadsheet-style formulas

### Date/Time Transformations
- Reformat timestamps to human-readable layouts
- Add/subtract time from dates
- Calculate time between two dates
- Convert between time zones
- Compare dates
- Units: years, months, weeks, days, hours, minutes, seconds

### Utility Functions
- **Pick from list**: Choose item from comma-separated list
- **Lookup Table**: Find matching value given a key
- **Line-item to Text**: Flatten line items to text
- **Text to Line-item**: Convert text to line items
- **Line Itemizer**: Convert multiple fields to line items
- **Import CSV**: Import CSV files as line items

### AI Integration
- Formatter works with AI to discover formatting options
- Describe needed transformation in plain language
- Zapier drafts the relevant Formatter step

## Looping

### What Is Looping?
- Run actions multiple times for each item in a list
- Works with line items, text strings, or number ranges

### Loop Types
- **Create Loop From Line Items**: Iterate over structured data
- **Create Loop From Text**: Iterate over delimiter-separated text
- **Create Loop From Numbers**: Repeat actions a set number of times

### Limitations
- Maximum 500 iterations per loop
- All iterations execute in parallel (simultaneously)
- Nested loops not supported
- Only one loop per Zap
- Each action after loop uses 1 task per iteration

### Continue After Loop
- Use "Continue Once Loop Complete" filter
- Checks "Loop Iteration is Last" boolean value
- Actions after this filter run only once when loop completes

## Best Practices

1. **Place Filters early** to prevent unnecessary task usage
2. **Keep Path branches minimal** and mutually exclusive
3. **Use Paths when outcomes truly differ** (e.g., enterprise vs trial customers)
4. **Every action counts as a task** including filters, formatters, and notifications
5. **Test thoroughly** - loops only test first iteration

## Task Counting

| Step Type | Counts as Task? |
|-----------|-----------------|
| Trigger | No |
| Action | Yes |
| Filter | No |
| Formatter | No |
| Path | No (but actions within do) |
| Delay | No |
| Loop (setup) | No |
| Actions in Loop | Yes (per iteration) |

## Sources

- [Paths: Add conditional logic to your Zaps - Zapier](https://zapier.com/blog/zapier-paths-conditional-workflows/)
- [Add conditions to Zaps with filters - Zapier](https://help.zapier.com/hc/en-us/articles/8496276332557-Add-conditions-to-Zaps-with-filters)
- [Get started with Formatter - Zapier](https://help.zapier.com/hc/en-us/articles/8496212590093-Get-started-with-Formatter)
- [Loop your Zap actions - Zapier](https://help.zapier.com/hc/en-us/articles/8496106701453-Loop-your-Zap-actions)
- [Filter and path rules in Zaps - Zapier](https://help.zapier.com/hc/en-us/articles/8496180919949-Filter-and-path-rules-in-Zaps)
