/**
 * Secret Remediation Engine
 *
 * Provides automated and semi-automated remediation for detected secrets
 * Features:
 * - Automatic secret removal and .env migration
 * - Pull request creation for fixes
 * - Remediation suggestions and guidance
 * - Safe secret rotation workflows
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface RemediationOptions {
  secretId: string;
  file: string;
  line: number;
  match: string;
  patternName: string;
  strategy: RemediationStrategy;
  createPR?: boolean;
  autoCommit?: boolean;
}

export enum RemediationStrategy {
  REMOVE_ONLY = 'remove_only',           // Just remove the secret
  ENV_VARIABLE = 'env_variable',         // Move to .env file
  AWS_SECRETS_MANAGER = 'aws_secrets',   // Migrate to AWS Secrets Manager
  AZURE_KEY_VAULT = 'azure_keyvault',    // Migrate to Azure Key Vault
  HASHICORP_VAULT = 'hashicorp_vault',   // Migrate to HashiCorp Vault
  CREDENTIAL_MANAGER = 'credential_mgr'  // Use platform credential manager
}

export interface RemediationResult {
  success: boolean;
  strategy: RemediationStrategy;
  changes: Array<{
    file: string;
    type: 'modified' | 'created' | 'deleted';
    description: string;
  }>;
  envVariable?: string;
  secretName?: string;
  pullRequestUrl?: string;
  rotationRequired: boolean;
  rotationInstructions?: string;
  error?: string;
}

export interface RemediationSuggestion {
  strategy: RemediationStrategy;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  effort: 'low' | 'medium' | 'high';
  benefits: string[];
  steps: string[];
}

export class SecretRemediationEngine {
  private static instance: SecretRemediationEngine;

  private constructor() {}

  public static getInstance(): SecretRemediationEngine {
    if (!SecretRemediationEngine.instance) {
      SecretRemediationEngine.instance = new SecretRemediationEngine();
    }
    return SecretRemediationEngine.instance;
  }

  /**
   * Get remediation suggestions for a detected secret
   */
  public getSuggestions(patternName: string, file: string): RemediationSuggestion[] {
    const suggestions: RemediationSuggestion[] = [];

    // Environment variable migration (always recommended)
    suggestions.push({
      strategy: RemediationStrategy.ENV_VARIABLE,
      confidence: 'high',
      description: 'Move secret to environment variable',
      effort: 'low',
      benefits: [
        'Simple and quick to implement',
        'Works with existing .env workflow',
        'No external dependencies'
      ],
      steps: [
        'Create/update .env file with secret',
        'Replace hardcoded value with process.env.VARIABLE_NAME',
        'Add variable name to .env.example',
        'Ensure .env is in .gitignore',
        'Update documentation'
      ]
    });

    // Cloud-specific suggestions
    if (patternName.includes('AWS')) {
      suggestions.push({
        strategy: RemediationStrategy.AWS_SECRETS_MANAGER,
        confidence: 'high',
        description: 'Migrate to AWS Secrets Manager',
        effort: 'medium',
        benefits: [
          'Centralized secret management',
          'Automatic rotation',
          'Fine-grained access control',
          'Audit logging'
        ],
        steps: [
          'Create secret in AWS Secrets Manager',
          'Update code to fetch from Secrets Manager',
          'Configure IAM permissions',
          'Test retrieval in all environments',
          'Remove hardcoded secret'
        ]
      });
    }

    if (patternName.includes('Azure') || patternName.includes('Microsoft')) {
      suggestions.push({
        strategy: RemediationStrategy.AZURE_KEY_VAULT,
        confidence: 'high',
        description: 'Migrate to Azure Key Vault',
        effort: 'medium',
        benefits: [
          'Enterprise-grade secret management',
          'Integration with Azure services',
          'HSM-backed security',
          'Compliance and audit support'
        ],
        steps: [
          'Create Azure Key Vault instance',
          'Store secret in Key Vault',
          'Update application to use Key Vault SDK',
          'Configure managed identity/service principal',
          'Remove hardcoded secret'
        ]
      });
    }

    // Platform credential manager for API keys
    if (file.includes('workflow') || file.includes('node')) {
      suggestions.push({
        strategy: RemediationStrategy.CREDENTIAL_MANAGER,
        confidence: 'high',
        description: 'Use workflow platform credential manager',
        effort: 'low',
        benefits: [
          'Encrypted storage',
          'RBAC integration',
          'Workflow-native solution',
          'No external dependencies'
        ],
        steps: [
          'Create credential in Credentials Manager',
          'Reference credential in workflow config',
          'Remove hardcoded value',
          'Test workflow execution'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Execute remediation for a detected secret
   */
  public async remediate(options: RemediationOptions): Promise<RemediationResult> {
    try {
      switch (options.strategy) {
        case RemediationStrategy.ENV_VARIABLE:
          return await this.remediateWithEnvVariable(options);

        case RemediationStrategy.REMOVE_ONLY:
          return await this.remediateRemoveOnly(options);

        case RemediationStrategy.CREDENTIAL_MANAGER:
          return await this.remediateWithCredentialManager(options);

        default:
          return {
            success: false,
            strategy: options.strategy,
            changes: [],
            rotationRequired: true,
            error: 'Strategy not yet implemented'
          };
      }
    } catch (error) {
      return {
        success: false,
        strategy: options.strategy,
        changes: [],
        rotationRequired: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remediate by moving secret to .env file
   */
  private async remediateWithEnvVariable(options: RemediationOptions): Promise<RemediationResult> {
    const changes: Array<{ file: string; type: 'modified' | 'created' | 'deleted'; description: string }> = [];

    // Generate environment variable name
    const envVarName = this.generateEnvVarName(options.patternName, options.file);

    // Read the source file
    const filePath = path.resolve(options.file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Replace secret with environment variable reference
    const lineIndex = options.line - 1;
    const originalLine = lines[lineIndex];
    const updatedLine = originalLine.replace(
      options.match,
      `process.env.${envVarName}`
    );

    lines[lineIndex] = updatedLine;

    // Write updated file
    fs.writeFileSync(filePath, lines.join('\n'));
    changes.push({
      file: options.file,
      type: 'modified',
      description: `Replaced hardcoded secret with process.env.${envVarName}`
    });

    // Update .env file
    const envPath = path.resolve('.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Add new environment variable (with placeholder)
    envContent += `\n# Added by secret remediation\n${envVarName}=${options.match}\n`;
    fs.writeFileSync(envPath, envContent);
    changes.push({
      file: '.env',
      type: fs.existsSync(envPath) ? 'modified' : 'created',
      description: `Added ${envVarName} environment variable`
    });

    // Update .env.example
    const envExamplePath = path.resolve('.env.example');
    let envExampleContent = '';

    if (fs.existsSync(envExamplePath)) {
      envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    }

    envExampleContent += `\n# ${options.patternName}\n${envVarName}=your_${envVarName.toLowerCase()}_here\n`;
    fs.writeFileSync(envExamplePath, envExampleContent);
    changes.push({
      file: '.env.example',
      type: fs.existsSync(envExamplePath) ? 'modified' : 'created',
      description: `Added ${envVarName} template to .env.example`
    });

    // Ensure .env is in .gitignore
    const gitignorePath = path.resolve('.gitignore');
    if (fs.existsSync(gitignorePath)) {
      let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignoreContent.includes('.env')) {
        gitignoreContent += '\n# Environment variables\n.env\n';
        fs.writeFileSync(gitignorePath, gitignoreContent);
        changes.push({
          file: '.gitignore',
          type: 'modified',
          description: 'Added .env to .gitignore'
        });
      }
    }

    // Get rotation instructions
    const rotationInstructions = this.getRotationInstructions(options.patternName);

    return {
      success: true,
      strategy: RemediationStrategy.ENV_VARIABLE,
      changes,
      envVariable: envVarName,
      rotationRequired: true,
      rotationInstructions
    };
  }

  /**
   * Remediate by just removing the secret
   */
  private async remediateRemoveOnly(options: RemediationOptions): Promise<RemediationResult> {
    const changes: Array<{ file: string; type: 'modified' | 'created' | 'deleted'; description: string }> = [];

    // Read the source file
    const filePath = path.resolve(options.file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Remove or comment out the line with the secret
    const lineIndex = options.line - 1;
    lines[lineIndex] = `// REMOVED: ${options.patternName} (Secret remediation)`;

    // Write updated file
    fs.writeFileSync(filePath, lines.join('\n'));
    changes.push({
      file: options.file,
      type: 'modified',
      description: `Removed hardcoded ${options.patternName}`
    });

    return {
      success: true,
      strategy: RemediationStrategy.REMOVE_ONLY,
      changes,
      rotationRequired: true,
      rotationInstructions: this.getRotationInstructions(options.patternName)
    };
  }

  /**
   * Remediate using platform credential manager
   */
  private async remediateWithCredentialManager(options: RemediationOptions): Promise<RemediationResult> {
    const changes: Array<{ file: string; type: 'modified' | 'created' | 'deleted'; description: string }> = [];

    // Generate credential name
    const credentialName = this.generateCredentialName(options.patternName, options.file);

    // Read the source file
    const filePath = path.resolve(options.file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Replace secret with credential reference
    const lineIndex = options.line - 1;
    const originalLine = lines[lineIndex];
    const updatedLine = originalLine.replace(
      options.match,
      `$credentials('${credentialName}')`
    );

    lines[lineIndex] = updatedLine;

    // Write updated file
    fs.writeFileSync(filePath, lines.join('\n'));
    changes.push({
      file: options.file,
      type: 'modified',
      description: `Replaced hardcoded secret with credential reference: ${credentialName}`
    });

    return {
      success: true,
      strategy: RemediationStrategy.CREDENTIAL_MANAGER,
      changes,
      secretName: credentialName,
      rotationRequired: true,
      rotationInstructions: `
1. Create credential in Credential Manager with name: ${credentialName}
2. Set the credential value to your actual secret
3. Ensure proper RBAC permissions are configured
4. Test the workflow to verify credential is loaded correctly
5. Rotate the exposed secret at its source
      `.trim()
    };
  }

  /**
   * Generate environment variable name from pattern and file
   */
  private generateEnvVarName(patternName: string, file: string): string {
    // Extract service name from pattern
    const service = patternName.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '_');

    // Extract file context
    const fileName = path.basename(file, path.extname(file)).toUpperCase().replace(/[^A-Z0-9]/g, '_');

    return `${service}_${fileName}_SECRET`;
  }

  /**
   * Generate credential name
   */
  private generateCredentialName(patternName: string, file: string): string {
    const service = patternName.split(' ')[0].toLowerCase();
    const fileName = path.basename(file, path.extname(file)).toLowerCase();

    return `${service}-${fileName}-credential`;
  }

  /**
   * Get rotation instructions for a secret type
   */
  private getRotationInstructions(patternName: string): string {
    const instructions: { [key: string]: string } = {
      'AWS Access Key': `
1. Go to AWS Console → IAM → Users → Security Credentials
2. Deactivate the exposed access key
3. Create a new access key
4. Update the .env file with the new key
5. Delete the old access key
6. Review CloudTrail logs for unauthorized access
      `.trim(),

      'GitHub Personal Access Token': `
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Revoke the exposed token
3. Generate a new token with the same scopes
4. Update the .env file with the new token
5. Check repository audit logs for suspicious activity
      `.trim(),

      'Stripe API Key': `
1. Go to Stripe Dashboard → Developers → API keys
2. Roll the exposed key
3. Update the .env file with the new key
4. Check Stripe logs for unauthorized API calls
5. Review recent transactions for anomalies
      `.trim(),

      'Google API Key': `
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Regenerate the exposed key
3. Update the .env file with the new key
4. Review Cloud Audit Logs
5. Check for unexpected API usage/billing
      `.trim()
    };

    return instructions[patternName] || `
1. Immediately rotate/regenerate the exposed secret at its source
2. Update all applications using the old secret
3. Monitor for unauthorized access
4. Review audit logs for the exposure period
5. Document the incident for security review
    `.trim();
  }

  /**
   * Create a pull request with remediation changes
   */
  public async createRemediationPR(
    secretId: string,
    changes: Array<{ file: string; type: string; description: string }>,
    rotationInstructions: string
  ): Promise<string> {
    try {
      // Create a new branch
      const branchName = `secret-remediation-${secretId}-${Date.now()}`;
      execSync(`git checkout -b ${branchName}`);

      // Stage changes
      for (const change of changes) {
        execSync(`git add ${change.file}`);
      }

      // Commit
      const commitMessage = `fix(security): Remediate exposed secret ${secretId}

Automated remediation of detected secret.

Changes:
${changes.map(c => `- ${c.description}`).join('\n')}

⚠️ IMPORTANT: Secret rotation required!
${rotationInstructions}

🤖 Generated by Secret Remediation Engine
      `;

      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

      // Push branch
      execSync(`git push -u origin ${branchName}`);

      // Create PR using GitHub CLI
      const prTitle = `[Security] Remediate exposed secret ${secretId}`;
      const prBody = `## 🔒 Secret Remediation

This PR automatically remediates an exposed secret detected by our security scanner.

### Changes
${changes.map(c => `- **${c.file}**: ${c.description}`).join('\n')}

### ⚠️ Action Required: Secret Rotation

${rotationInstructions}

### Security Checklist
- [ ] Old secret has been rotated/revoked
- [ ] New secret has been configured in all environments
- [ ] Audit logs reviewed for unauthorized access
- [ ] Team notified of the exposure
- [ ] Incident documented

**Automated by:** Secret Remediation Engine
**Secret ID:** ${secretId}
      `;

      const prUrl = execSync(
        `gh pr create --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}"`,
        { encoding: 'utf8' }
      ).trim();

      return prUrl;

    } catch (error) {
      throw new Error(`Failed to create PR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton export
export function getRemediationEngine(): SecretRemediationEngine {
  return SecretRemediationEngine.getInstance();
}
