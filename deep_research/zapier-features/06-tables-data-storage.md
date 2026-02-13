# Zapier Tables and Data Storage

## Overview

Zapier Tables is a no-code database solution that allows users to create, store, and manage data directly within the Zapier ecosystem, seamlessly integrating with Zaps and Interfaces.

## Core Features

### Database Capabilities
- Create simple databases without coding
- Store and manage structured data
- Connect directly to Zaps for automation
- Build apps with Interfaces integration

### Field Types

| Field Type | Description |
|------------|-------------|
| Text | Single line or multi-line text |
| Number | Numeric values |
| Date | Date and time values |
| Dropdown | Single selection from options |
| Multi-select | Multiple selections from options |
| Checkbox | Boolean true/false |
| URL | Web links |
| Email | Email addresses |
| Phone | Phone numbers |
| Currency | Monetary values |
| Linked Records | Connect records between tables |
| Formula | Calculated fields |
| AI | AI-generated content |
| Attachment | File uploads |

### Linked Records
- Associate records between different tables
- Maintain relational consistency
- Create one-to-many and many-to-many relationships
- Essential for complex data models

## Views and Filtering

### Table Views
- Filter records without affecting underlying data
- Hide specific fields from view
- Share views with limited access
- Create multiple views per table

### Filter Logic
- Uses AND logic (not OR)
- Records must meet ALL filter criteria
- Combine multiple conditions
- Save as reusable views

## Usage Limits

### Plan-Based Limits

| Plan | Tables | Records per Table |
|------|--------|-------------------|
| Free | Limited | Limited |
| Professional | More tables | Higher limits |
| Tables Add-on | 100 tables | 100,000 records each |

### Tables Add-on
- $20/month on top of existing subscription
- Unlock 100 tables
- 100,000 records per table
- Advanced features included

### Monitoring Usage
- View account-wide record usage
- Track usage against plan limits
- Upgrade prompts when approaching limits

## AI-Powered Features

### AI Fields
- Create fields that generate content with AI
- Write emails based on existing data
- Generate summaries, analysis, etc.
- Describe desired output in natural language

### Use Cases
- Auto-generate lead responses
- Create personalized content
- Summarize lengthy text fields
- Translate content

## Formulas and Calculations

### Built-in Functions
- Mathematical calculations
- Text manipulation
- Date calculations
- Logical operations

### Data Analysis
- Aggregation across records
- Automated decision-making
- Dynamic computed values

## Integration with Interfaces

### Building from Tables
- Create Interfaces directly from Tables
- Auto-generates form and table pages
- Two pre-built page templates

### Table Components
- Display Tables data in Interfaces
- Configure user permissions:
  - Create (add new records)
  - Edit (modify existing)
  - Delete (remove records)
- Pagination: 10, 20, or 50 rows

### Limitations
- Cannot display JSON fields
- Cannot display Formula fields in table components

## Forms Integration

### Interface Forms
- Link forms to Tables for data input
- Forms always start empty
- Submit creates new record

### Prefilling Forms
- Use query string parameters
- Reference internal field IDs
- Pre-populate from URLs

### Updating Records
- No native form update capability
- Requires Zap to update existing records
- Forms designed for creation, not editing

## Zap Integration

### Triggers
- New record created
- Record updated
- Record matches condition
- Continue from record

### Actions
- Create record
- Update record
- Find record
- Find or create record
- Delete record

### Automation Patterns
- Data entry from forms
- Cross-app synchronization
- Conditional record updates
- Bulk operations via loops

## Team Collaboration

### Permissions
- Control team access levels
- Set per-table permissions
- Protect sensitive data
- Share specific views only

### Sharing
- Share tables with team members
- Grant read/write access
- External sharing via Interfaces

## Competitive Features Summary

| Feature | Zapier Tables Capability |
|---------|-------------------------|
| Field types | 15+ including AI fields |
| Relational data | Linked records support |
| Views | Multiple filtered views |
| AI integration | AI-powered field generation |
| Formulas | Built-in calculation engine |
| Interface builder | Native Interfaces integration |
| Max records | 100,000 per table (with add-on) |
| Zap triggers/actions | Full CRUD operations |

## Comparison to Alternatives

### vs Airtable
- Simpler interface
- Native Zapier integration
- Fewer advanced features
- Lower learning curve

### vs Google Sheets
- Structured data vs spreadsheet
- Better for automation
- Type enforcement
- View permissions

### vs Notion Databases
- Purpose-built for automation
- Tighter Zap integration
- Less flexible formatting
- Better performance at scale

## Sources

- [Create tables and store data with Zapier Tables](https://help.zapier.com/hc/en-us/articles/9804340895245-Create-tables-and-store-data-with-Zapier-Tables)
- [Zapier Tables usage limits](https://help.zapier.com/hc/en-us/articles/15721386410765-Zapier-Tables-usage-limits)
- [Different field types in Zapier Tables](https://help.zapier.com/hc/en-us/articles/9775472454157-Different-field-types-in-Zapier-Tables)
- [Zapier Tables: Take action on your data automatically](https://zapier.com/blog/zapier-tables-guide/)
- [Display tables on Zapier Interfaces](https://help.zapier.com/hc/en-us/articles/34688036764429-Display-tables-on-Zapier-Interfaces)
