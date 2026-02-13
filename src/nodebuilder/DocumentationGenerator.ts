/**
 * Documentation Generator
 * Auto-generate comprehensive documentation for custom nodes
 */

import {
  NodeBuilderConfig,
  OperationDefinition,
  ParameterDefinition,
  AuthType,
  FieldType,
} from '../types/nodebuilder';

export class DocumentationGenerator {
  private config: NodeBuilderConfig;

  constructor(config: NodeBuilderConfig) {
    this.config = config;
  }

  /**
   * Generate complete documentation
   */
  generate(): string {
    const sections: string[] = [];

    // Title and overview
    sections.push(this.generateTitle());
    sections.push(this.generateOverview());

    // Installation
    sections.push(this.generateInstallation());

    // Authentication
    if (this.config.authentication) {
      sections.push(this.generateAuthentication());
    }

    // Operations
    sections.push(this.generateOperations());

    // Parameters
    if (this.config.parameters && this.config.parameters.length > 0) {
      sections.push(this.generateParameters());
    }

    // Examples
    if (this.config.examples && this.config.examples.length > 0) {
      sections.push(this.generateExamples());
    }

    // Troubleshooting
    sections.push(this.generateTroubleshooting());

    // API Reference
    sections.push(this.generateApiReference());

    // Footer
    sections.push(this.generateFooter());

    return sections.join('\n\n');
  }

  /**
   * Generate title section
   */
  private generateTitle(): string {
    return `# ${this.config.displayName}

![Version](https://img.shields.io/badge/version-${this.config.version}-blue)
![Category](https://img.shields.io/badge/category-${this.config.category}-green)
${this.config.tags?.length ? `![Tags](https://img.shields.io/badge/tags-${this.config.tags.join('%20%7C%20')}-orange)` : ''}`;
  }

  /**
   * Generate overview section
   */
  private generateOverview(): string {
    return `## Overview

${this.config.description}

### Features

${this.generateFeaturesList()}

### Quick Stats

| Metric | Value |
|--------|-------|
| Operations | ${this.config.operations?.length || 0} |
| Parameters | ${this.config.parameters?.length || 0} |
| Authentication | ${this.config.authentication?.type || 'None'} |
| Category | ${this.config.category} |`;
  }

  /**
   * Generate features list
   */
  private generateFeaturesList(): string {
    const features: string[] = [];

    if (this.config.operations && this.config.operations.length > 0) {
      features.push(`- ${this.config.operations.length} operations available`);
    }

    if (this.config.authentication) {
      features.push(`- Secure ${this.config.authentication.type} authentication`);
    }

    if (this.config.parameters && this.config.parameters.length > 0) {
      features.push(`- ${this.config.parameters.length} configurable parameters`);
    }

    if (this.config.inputMapping && this.config.inputMapping.length > 0) {
      features.push('- Advanced data mapping support');
    }

    if (features.length === 0) {
      return '- Custom integration node';
    }

    return features.join('\n');
  }

  /**
   * Generate installation section
   */
  private generateInstallation(): string {
    return `## Installation

### From Marketplace

1. Open your workflow editor
2. Navigate to **Settings** > **Community Nodes**
3. Search for "${this.config.displayName}"
4. Click **Install**

### Manual Installation

\`\`\`bash
npm install @workflow/${this.config.name}
\`\`\``;
  }

  /**
   * Generate authentication section
   */
  private generateAuthentication(): string {
    if (!this.config.authentication) {
      return '';
    }

    const auth = this.config.authentication;

    let authDetails = '';
    switch (auth.type) {
      case AuthType.API_KEY:
        authDetails = `This node uses API Key authentication. You'll need to provide your API key in the credentials.

**Location**: ${auth.fields[0]?.headerName ? 'Header' : 'Query Parameter'}
**Field Name**: ${auth.fields[0]?.headerName || auth.fields[0]?.queryName || 'api_key'}`;
        break;

      case AuthType.BEARER_TOKEN:
        authDetails = `This node uses Bearer Token authentication. You'll need to provide a valid bearer token.`;
        break;

      case AuthType.OAUTH2:
        authDetails = `This node uses OAuth2 authentication. You'll need to:

1. Register your application
2. Obtain client ID and secret
3. Configure the OAuth2 flow in credentials`;
        break;

      case AuthType.BASIC_AUTH:
        authDetails = `This node uses Basic Authentication. Provide your username and password.`;
        break;
    }

    return `## Authentication

### ${auth.name}

${auth.description}

${authDetails}

### Required Credentials

| Field | Type | Description |
|-------|------|-------------|
${auth.fields.map((f) => `| ${f.displayName} | ${f.type} | ${f.description} |`).join('\n')}`;
  }

  /**
   * Generate operations section
   */
  private generateOperations(): string {
    if (!this.config.operations || this.config.operations.length === 0) {
      return '## Operations\n\nNo operations defined.';
    }

    const operationDocs = this.config.operations.map((op) => this.generateOperationDoc(op)).join('\n\n');

    return `## Operations

${operationDocs}`;
  }

  /**
   * Generate documentation for a single operation
   */
  private generateOperationDoc(operation: OperationDefinition): string {
    const paramTable = operation.parameters.length > 0
      ? `\n\n**Parameters**:\n\n| Name | Type | Required | Description |
|------|------|----------|-------------|
${operation.parameters.map((p) => `| ${p.displayName} | \`${p.type}\` | ${p.required ? 'Yes' : 'No'} | ${p.description} |`).join('\n')}`
      : '';

    return `### ${operation.displayName}

${operation.description}

**Method**: \`${operation.httpConfig.method}\`
**Endpoint**: \`${operation.httpConfig.endpoint}\`${paramTable}`;
  }

  /**
   * Generate parameters section
   */
  private generateParameters(): string {
    if (!this.config.parameters || this.config.parameters.length === 0) {
      return '';
    }

    const paramDocs = this.config.parameters.map((p) => this.generateParameterDoc(p)).join('\n');

    return `## Global Parameters

These parameters are available across all operations.

| Name | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
${paramDocs}`;
  }

  /**
   * Generate documentation for a single parameter
   */
  private generateParameterDoc(param: ParameterDefinition): string {
    const defaultValue = param.default !== undefined ? `\`${JSON.stringify(param.default)}\`` : '-';
    return `| ${param.displayName} | \`${param.type}\` | ${param.required ? 'Yes' : 'No'} | ${param.description} | ${defaultValue} |`;
  }

  /**
   * Generate examples section
   */
  private generateExamples(): string {
    if (!this.config.examples || this.config.examples.length === 0) {
      return '';
    }

    const examples = this.config.examples
      .map(
        (ex) => `### ${ex.name}

${ex.description}

**Input**:
\`\`\`json
${JSON.stringify(ex.input, null, 2)}
\`\`\`

**Expected Output**:
\`\`\`json
${JSON.stringify(ex.expectedOutput, null, 2)}
\`\`\``
      )
      .join('\n\n');

    return `## Examples

${examples}`;
  }

  /**
   * Generate troubleshooting section
   */
  private generateTroubleshooting(): string {
    return `## Troubleshooting

### Common Issues

#### Authentication Errors

If you're experiencing authentication errors:

1. Verify your credentials are correct
2. Check that your ${this.config.authentication?.type || 'authentication'} is properly configured
3. Ensure your API key/token hasn't expired

#### Connection Issues

- Verify the API endpoint is accessible
- Check your network connection
- Review firewall settings

#### Data Mapping Issues

- Ensure input data format matches the expected schema
- Check that required parameters are provided
- Validate JSON syntax if using JSON parameters

### Getting Help

- Check the [Documentation](#)
- Visit the [Community Forum](#)
- Report bugs on [GitHub](#)`;
  }

  /**
   * Generate API reference section
   */
  private generateApiReference(): string {
    return `## API Reference

### Node Configuration

\`\`\`typescript
interface ${this.toPascalCase(this.config.name)}Config {
${this.config.parameters?.map((p) => `  ${p.name}${p.required ? '' : '?'}: ${this.mapFieldTypeToTS(p.type)};`).join('\n') || '  // No parameters'}
}
\`\`\`

### Response Format

All operations return data in the following format:

\`\`\`typescript
interface Response {
  success: boolean;
  data: any;
  error?: string;
}
\`\`\``;
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `## Contributing

We welcome contributions! Please see our [Contributing Guide](#) for details.

## License

${this.config.generationSettings ? 'MIT' : 'See LICENSE file for details'}

## Support

- **Author**: ${this.config.author}
- **Version**: ${this.config.version}
- **Documentation**: [Full Docs](#)
- **Issues**: [Report a Bug](#)

---

*Auto-generated documentation for ${this.config.displayName} v${this.config.version}*`;
  }

  /**
   * Generate README.md specifically
   */
  generateReadme(): string {
    return this.generate();
  }

  /**
   * Generate API documentation
   */
  generateApiDocs(): string {
    const operations = this.config.operations || [];

    return `# ${this.config.displayName} API Documentation

## Base URL

\`\`\`
https://api.example.com
\`\`\`

## Authentication

${this.config.authentication?.description || 'No authentication required'}

## Endpoints

${operations
  .map(
    (op) => `### ${op.displayName}

\`${op.httpConfig.method} ${op.httpConfig.endpoint}\`

${op.description}

**Request**:
\`\`\`bash
curl -X ${op.httpConfig.method} \\
  ${op.httpConfig.endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{}'
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`
`
  )
  .join('\n\n')}`;
  }

  /**
   * Generate changelog
   */
  generateChangelog(): string {
    return `# Changelog

All notable changes to ${this.config.displayName} will be documented in this file.

## [${this.config.version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release
- ${this.config.operations?.length || 0} operations
- ${this.config.authentication ? this.config.authentication.type + ' authentication' : 'No authentication'}

### Features
${this.generateFeaturesList()}

## Future Releases

- Planned enhancements will be listed here

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).`;
  }

  /**
   * Helper: Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (char) => char.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Helper: Map FieldType to TypeScript type
   */
  private mapFieldTypeToTS(fieldType: FieldType): string {
    switch (fieldType) {
      case FieldType.STRING:
      case FieldType.PASSWORD:
      case FieldType.TEXT_AREA:
      case FieldType.URL:
      case FieldType.EMAIL:
      case FieldType.SELECT:
        return 'string';
      case FieldType.NUMBER:
        return 'number';
      case FieldType.BOOLEAN:
        return 'boolean';
      case FieldType.JSON:
        return 'any';
      case FieldType.MULTI_SELECT:
        return 'string[]';
      default:
        return 'any';
    }
  }
}
