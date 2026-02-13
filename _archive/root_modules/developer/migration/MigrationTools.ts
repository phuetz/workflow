import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as semver from 'semver';
import * as diff from 'diff';
import { glob } from 'glob';

export interface MigrationConfig {
  sourceVersion: string;
  targetVersion: string;
  sourceDir: string;
  backupDir?: string;
  dryRun?: boolean;
  interactive?: boolean;
  autoBackup?: boolean;
  validateOnly?: boolean;
}

export interface Migration {
  id: string;
  version: string;
  description: string;
  type: 'breaking' | 'feature' | 'fix' | 'security';
  up: (context: MigrationContext) => Promise<void>;
  down?: (context: MigrationContext) => Promise<void>;
  validate?: (context: MigrationContext) => Promise<boolean>;
  estimatedDuration?: number;
  requiresRestart?: boolean;
  dependencies?: string[];
}

export interface MigrationContext {
  sourceDir: string;
  config: unknown;
  logger: (message: string, level?: 'info' | 'warn' | 'error') => void;
  helpers: MigrationHelpers;
  state: Map<string, unknown>;
}

export interface MigrationHelpers {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readJSON: (path: string) => Promise<unknown>;
  writeJSON: (path: string, data: unknown) => Promise<void>;
  updateJSON: (path: string, updater: (data: unknown) => unknown) => Promise<void>;
  findFiles: (pattern: string) => Promise<string[]>;
  transformCode: (code: string, transformer: CodeTransformer) => string;
  updateImports: (code: string, mappings: Record<string, string>) => string;
  updateWorkflow: (workflow: unknown, transformer: WorkflowTransformer) => unknown;
  backup: (filePath: string) => Promise<void>;
  restore: (filePath: string) => Promise<void>;
}

export interface CodeTransformer {
  type: 'typescript' | 'javascript' | 'json';
  transform: (ast: unknown) => unknown;
}

export interface WorkflowTransformer {
  transformNode?: (node: unknown) => unknown;
  transformEdge?: (edge: unknown) => unknown;
  transformConfig?: (config: unknown) => unknown;
  transformExpression?: (expression: string) => string;
}

export interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  errors: Array<{ migration: string; error: Error }>;
  warnings: string[];
  filesChanged: string[];
  duration: number;
  backupPath?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  code: string;
}

export interface ValidationWarning {
  file: string;
  message: string;
  suggestion?: string;
}

export class MigrationTools extends EventEmitter {
  private migrations: Map<string, Migration> = new Map();
  private executedMigrations: Set<string> = new Set();
  private backupPath: string | null = null;

  constructor() {
    super();
    this.registerBuiltInMigrations();
  }

  private registerBuiltInMigrations(): void {
    // V1 to V2 migrations
    this.registerMigration({
      id: 'v1-to-v2-node-structure',
      version: '2.0.0',
      description: 'Update node structure to V2 format',
      type: 'breaking',
      up: async (context) => {
        const workflowFiles = await context.helpers.findFiles('**/*.workflow');
        
        for (const file of workflowFiles) {
          await context.helpers.updateJSON(file, (workflow) => {
            // Update node structure
            if (workflow.nodes) {
              workflow.nodes = workflow.nodes.map((node: unknown) => {
                if (!node.data) {
                  return {
                    ...node,
                    data: {
                      label: node.label || node.name,
                      config: node.config || {}
                    }
                  };
                }
                return node;
              });
            }
            return workflow;
          });
        }
      }
    });

    this.registerMigration({
      id: 'v1-to-v2-expression-syntax',
      version: '2.0.0',
      description: 'Update expression syntax from {{}} to ${}',
      type: 'breaking',
      up: async (context) => {
        const files = await context.helpers.findFiles('**/*.{workflow,json}');
        
        for (const file of files) {
          const content = await context.helpers.readFile(file);
          const updated = content.replace(/\{\{([^}]+)\}\}/g, '${$1}');
          
          if (content !== updated) {
            await context.helpers.writeFile(file, updated);
          }
        }
      }
    });

    // V2 to V3 migrations
    this.registerMigration({
      id: 'v2-to-v3-async-nodes',
      version: '3.0.0',
      description: 'Convert sync nodes to async',
      type: 'feature',
      up: async (context) => {
        const nodeFiles = await context.helpers.findFiles('**/nodes/**/*.ts');
        
        for (const file of nodeFiles) {
          const content = await context.helpers.readFile(file);
          const updated = context.helpers.transformCode(content, {
            type: 'typescript',
            transform: (ast) => {
              // Transform execute methods to async
              // This is a simplified example
              return ast;
            }
          });
          
          await context.helpers.writeFile(file, updated);
        }
      }
    });

    // Security migrations
    this.registerMigration({
      id: 'security-expression-validation',
      version: '2.5.0',
      description: 'Add expression validation for security',
      type: 'security',
      up: async (context) => {
        const configFiles = await context.helpers.findFiles('**/config.json');
        
        for (const file of configFiles) {
          await context.helpers.updateJSON(file, (config) => {
            if (!config.security) {
              config.security = {};
            }
            config.security.validateExpressions = true;
            config.security.allowedExpressionPatterns = [
              '^\\$json',
              '^\\$node',
              '^\\$workflow',
              '^\\$env'
            ];
            return config;
          });
        }
      }
    });

    // Database schema migrations
    this.registerMigration({
      id: 'database-schema-v2',
      version: '2.0.0',
      description: 'Update database schema for V2',
      type: 'breaking',
      requiresRestart: true,
      up: async (context) => {
        // Check if database migrations are needed
        const dbConfig = await context.helpers.readJSON('database/config.json').catch(() => null);
        
        if (dbConfig) {
          context.logger('Running database migrations...', 'info');
          
          // In a real implementation, run actual DB migrations
          // For now, update the schema version
          dbConfig.schemaVersion = '2.0.0';
          await context.helpers.writeJSON('database/config.json', dbConfig);
        }
      }
    });
  }

  public registerMigration(migration: Migration): void {
    this.migrations.set(migration.id, migration);
    this.emit('migration:registered', migration);
  }

  public async runMigrations(config: MigrationConfig): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      migrationsRun: [],
      errors: [],
      warnings: [],
      filesChanged: [],
      duration: 0
    };

    try {
      // Create backup if enabled
      if (config.autoBackup && !config.dryRun && !config.validateOnly) {
        this.backupPath = await this.createBackup(config);
        result.backupPath = this.backupPath;
      }

      // Find applicable migrations
      const applicableMigrations = this.findApplicableMigrations(
        config.sourceVersion,
        config.targetVersion
      );

      if (applicableMigrations.length === 0) {
        result.warnings.push('No migrations found for version range');
        result.success = true;
        return result;
      }

      // Sort migrations by version and dependencies
      const sortedMigrations = this.sortMigrations(applicableMigrations);

      // Create migration context
      const context = this.createMigrationContext(config);

      // Validate migrations if requested
      if (config.validateOnly) {
        const validation = await this.validateMigrations(sortedMigrations, context);
        result.success = validation.valid;
        result.warnings = validation.warnings.map(w => w.message);
        return result;
      }

      // Run migrations
      for (const migration of sortedMigrations) {
        try {
          this.emit('migration:start', migration);

          if (config.dryRun) {
            context.logger(`[DRY RUN] Would run migration: ${migration.id}`, 'info');
          } else {
            // Validate before running
            if (migration.validate) {
              const isValid = await migration.validate(context);
              if (!isValid) {
                throw new Error(`Validation failed for migration ${migration.id}`);
              }
            }

            // Run the migration
            await migration.up(context);
            this.executedMigrations.add(migration.id);
            result.migrationsRun.push(migration.id);
          }

          this.emit('migration:complete', migration);

        } catch (error) {
          this.emit('migration:error', { migration, error });
          result.errors.push({ migration: migration.id, error: error as Error });
          
          if (!config.dryRun && this.backupPath) {
            // Attempt rollback
            await this.rollback(config);
          }
          
          throw error;
        }
      }

      result.success = true;

    } catch (error) {
      result.success = false;
      this.emit('migrations:error', error);
    } finally {
      result.duration = Date.now() - startTime;
      this.emit('migrations:complete', result);
    }

    return result;
  }

  private findApplicableMigrations(sourceVersion: string, targetVersion: string): Migration[] {
    const migrations: Migration[] = [];

    for (const migration of this.migrations.values()) {
      if (semver.gt(migration.version, sourceVersion) && 
          semver.lte(migration.version, targetVersion)) {
        migrations.push(migration);
      }
    }

    return migrations;
  }

  private sortMigrations(migrations: Migration[]): Migration[] {
    // Build dependency graph
    const graph = new Map<string, Set<string>>();
    const migrationMap = new Map<string, Migration>();

    for (const migration of migrations) {
      graph.set(migration.id, new Set(migration.dependencies || []));
      migrationMap.set(migration.id, migration);
    }

    // Topological sort
    const sorted: Migration[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected: ${id}`);
      }

      visiting.add(id);
      const deps = graph.get(id) || new Set();
      
      for (const dep of deps) {
        if (migrationMap.has(dep)) {
          visit(dep);
        }
      }

      visiting.delete(id);
      visited.add(id);
      
      const migration = migrationMap.get(id);
      if (migration) {
        sorted.push(migration);
      }
    };

    for (const migration of migrations) {
      visit(migration.id);
    }

    // Sort by version within dependency order
    return sorted.sort((a, b) => semver.compare(a.version, b.version));
  }

  private createMigrationContext(config: MigrationConfig): MigrationContext {
    const state = new Map<string, unknown>();
    const changedFiles = new Set<string>();

    const context: MigrationContext = {
      sourceDir: config.sourceDir,
      config,
      logger: (message, level = 'info') => {
        this.emit('migration:log', { message, level });
        console.log(`[${level.toUpperCase()}] ${message}`);
      },
      state,
      helpers: {
        readFile: async (filePath) => {
          const fullPath = path.join(config.sourceDir, filePath);
          return fs.readFile(fullPath, 'utf-8');
        },
        
        writeFile: async (filePath, content) => {
          const fullPath = path.join(config.sourceDir, filePath);
          changedFiles.add(filePath);
          
          if (!config.dryRun) {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content);
          }
        },
        
        readJSON: async (filePath) => {
          const content = await context.helpers.readFile(filePath);
          return JSON.parse(content);
        },
        
        writeJSON: async (filePath, data) => {
          const content = JSON.stringify(data, null, 2);
          await context.helpers.writeFile(filePath, content);
        },
        
        updateJSON: async (filePath, updater) => {
          const data = await context.helpers.readJSON(filePath);
          const updated = updater(data);
          await context.helpers.writeJSON(filePath, updated);
        },
        
        findFiles: async (pattern) => {
          return glob(pattern, { cwd: config.sourceDir });
        },
        
        transformCode: (code, _transformer) => { // eslint-disable-line @typescript-eslint/no-unused-vars
          // In a real implementation, use AST transformation
          return code;
        },
        
        updateImports: (code, mappings) => {
          let updated = code;
          
          for (const [oldImport, newImport] of Object.entries(mappings)) {
            // Update import statements
            updated = updated.replace(
              new RegExp(`from ['"]${oldImport}['"]`, 'g'),
              `from '${newImport}'`
            );
            
            // Update require statements
            updated = updated.replace(
              new RegExp(`require\\(['"]${oldImport}['"]\\)`, 'g'),
              `require('${newImport}')`
            );
          }
          
          return updated;
        },
        
        updateWorkflow: (workflow, transformer) => {
          const updated = { ...workflow };
          
          if (transformer.transformNode && updated.nodes) {
            updated.nodes = updated.nodes.map(transformer.transformNode);
          }
          
          if (transformer.transformEdge && updated.edges) {
            updated.edges = updated.edges.map(transformer.transformEdge);
          }
          
          if (transformer.transformConfig && updated.config) {
            updated.config = transformer.transformConfig(updated.config);
          }
          
          return updated;
        },
        
        backup: async (filePath) => {
          if (config.backupDir) {
            const source = path.join(config.sourceDir, filePath);
            const dest = path.join(config.backupDir, filePath);
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.copyFile(source, dest);
          }
        },
        
        restore: async (filePath) => {
          if (config.backupDir) {
            const source = path.join(config.backupDir, filePath);
            const dest = path.join(config.sourceDir, filePath);
            await fs.copyFile(source, dest);
          }
        }
      }
    };

    return context;
  }

  private async createBackup(config: MigrationConfig): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = config.backupDir || path.join(config.sourceDir, '.migrations', 'backups', timestamp);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Copy all files
    const files = await glob('**/*', { 
      cwd: config.sourceDir,
      nodir: true,
      ignore: ['node_modules/**', '.git/**', '.migrations/**']
    });
    
    for (const file of files) {
      const source = path.join(config.sourceDir, file);
      const dest = path.join(backupDir, file);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(source, dest);
    }
    
    // Save backup metadata
    const metadata = {
      timestamp,
      sourceVersion: config.sourceVersion,
      targetVersion: config.targetVersion,
      files: files.length
    };
    
    await fs.writeFile(
      path.join(backupDir, 'backup-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    this.emit('backup:created', { path: backupDir, metadata });
    return backupDir;
  }

  private async rollback(config: MigrationConfig): Promise<void> {
    if (!this.backupPath) {
      throw new Error('No backup available for rollback');
    }
    
    this.emit('rollback:start', this.backupPath);
    
    // Restore files from backup
    const files = await glob('**/*', {
      cwd: this.backupPath,
      nodir: true,
      ignore: ['backup-metadata.json']
    });
    
    for (const file of files) {
      const source = path.join(this.backupPath, file);
      const dest = path.join(config.sourceDir, file);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(source, dest);
    }
    
    this.emit('rollback:complete', this.backupPath);
  }

  public async validateMigrations(
    migrations: Migration[],
    context: MigrationContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    for (const migration of migrations) {
      try {
        // Check if migration has a validator
        if (migration.validate) {
          const isValid = await migration.validate(context);
          if (!isValid) {
            result.valid = false;
            result.errors.push({
              file: 'migration',
              message: `Migration ${migration.id} validation failed`,
              code: 'MIGRATION_VALIDATION_FAILED'
            });
          }
        }

        // Check for breaking changes
        if (migration.type === 'breaking') {
          result.warnings.push({
            file: 'migration',
            message: `Migration ${migration.id} contains breaking changes`,
            suggestion: 'Review the migration documentation before proceeding'
          });
        }

        // Check dependencies
        if (migration.dependencies) {
          for (const dep of migration.dependencies) {
            if (!migrations.find(m => m.id === dep)) {
              result.errors.push({
                file: 'migration',
                message: `Migration ${migration.id} depends on missing migration ${dep}`,
                code: 'MISSING_DEPENDENCY'
              });
              result.valid = false;
            }
          }
        }

      } catch (error) {
        result.errors.push({
          file: 'migration',
          message: `Error validating migration ${migration.id}: ${error}`,
          code: 'VALIDATION_ERROR'
        });
        result.valid = false;
      }
    }

    // Check version compatibility
    const versionCheck = await this.checkVersionCompatibility(context);
    if (!versionCheck.compatible) {
      result.valid = false;
      result.errors.push(...versionCheck.errors);
    }

    // Add suggestions
    if (migrations.length > 10) {
      result.suggestions.push(
        'Consider running migrations in batches for large version jumps'
      );
    }

    if (migrations.some(m => m.requiresRestart)) {
      result.suggestions.push(
        'Some migrations require a restart. Plan for downtime accordingly.'
      );
    }

    return result;
  }

  private async checkVersionCompatibility(
    context: MigrationContext
  ): Promise<{ compatible: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];
    let compatible = true;

    try {
      // Check package.json version
      const packageJson = await context.helpers.readJSON('package.json');
      const currentVersion = packageJson.version;
      
      if (!semver.valid(currentVersion)) {
        errors.push({
          file: 'package.json',
          message: `Invalid version format: ${currentVersion}`,
          code: 'INVALID_VERSION'
        });
        compatible = false;
      }

      // Check for required dependencies
      const requiredDeps = {
        'node': '>=14.0.0',
        'typescript': '>=4.0.0'
      };

      for (const [dep, version] of Object.entries(requiredDeps)) {
        if (dep === 'node') {
          const nodeVersion = process.version;
          if (!semver.satisfies(nodeVersion, version)) {
            errors.push({
              file: 'environment',
              message: `Node.js version ${nodeVersion} does not satisfy ${version}`,
              code: 'INCOMPATIBLE_NODE_VERSION'
            });
            compatible = false;
          }
        }
      }

    } catch (error) {
      errors.push({
        file: 'unknown',
        message: `Error checking version compatibility: ${error}`,
        code: 'COMPATIBILITY_CHECK_ERROR'
      });
      compatible = false;
    }

    return { compatible, errors };
  }

  public async generateMigrationReport(
    config: MigrationConfig
  ): Promise<string> {
    const migrations = this.findApplicableMigrations(
      config.sourceVersion,
      config.targetVersion
    );

    let report = `# Migration Report

## Overview
- **Source Version**: ${config.sourceVersion}
- **Target Version**: ${config.targetVersion}
- **Total Migrations**: ${migrations.length}

## Migrations

`;

    const sortedMigrations = this.sortMigrations(migrations);

    for (const migration of sortedMigrations) {
      report += `### ${migration.id}
- **Version**: ${migration.version}
- **Type**: ${migration.type}
- **Description**: ${migration.description}
${migration.requiresRestart ? '- **Requires Restart**: Yes\n' : ''}
${migration.dependencies?.length ? `- **Dependencies**: ${migration.dependencies.join(', ')}\n` : ''}
${migration.estimatedDuration ? `- **Estimated Duration**: ${migration.estimatedDuration}ms\n` : ''}

`;
    }

    // Add file change analysis
    const context = this.createMigrationContext(config);
    const affectedFiles = new Set<string>();

    for (const migration of sortedMigrations) {
      // Dry run to collect affected files
      try {
        await migration.up(context);
      } catch {
        // Ignore errors in dry run
      }
    }

    if (affectedFiles.size > 0) {
      report += `## Affected Files

${Array.from(affectedFiles).map(f => `- ${f}`).join('\n')}
`;
    }

    // Add recommendations
    report += `
## Recommendations

1. **Backup**: ${config.autoBackup ? 'Enabled' : 'Create a manual backup before proceeding'}
2. **Testing**: Run migrations in a test environment first
3. **Downtime**: ${migrations.some(m => m.requiresRestart) ? 'Plan for service restart' : 'No restart required'}
4. **Review**: Carefully review breaking changes before proceeding
`;

    return report;
  }

  public async createCustomMigration(
    name: string,
    version: string,
    type: Migration['type'] = 'feature'
  ): Promise<string> {
    const id = `custom-${name}-${Date.now()}`;
    const template = `import { Migration, MigrationContext } from '@workflow/migration-tools';

export const migration: Migration = {
  id: '${id}',
  version: '${version}',
  description: '${name}',
  type: '${type}',
  
  async up(context: MigrationContext): Promise<void> {
    // Implement your migration logic here
    context.logger('Running ${name} migration...', 'info');
    
    // Example: Update configuration files
    const files = await context.helpers.findFiles('**/config.json');
    
    for (const file of files) {
      await context.helpers.updateJSON(file, (config) => {
        // Modify config as needed
        return config;
      });
    }
  },
  
  async down(context: MigrationContext): Promise<void> {
    // Implement rollback logic (optional)
    context.logger('Rolling back ${name} migration...', 'info');
  },
  
  async validate(context: MigrationContext): Promise<boolean> {
    // Implement validation logic (optional)
    try {
      // Check prerequisites
      return true;
    } catch (error) {
      context.logger(\`Validation failed: \${error}\`, 'error');
      return false;
    }
  }
};

export default migration;
`;

    const fileName = `migration-${id}.ts`;
    const filePath = path.join('migrations', fileName);
    
    await fs.mkdir('migrations', { recursive: true });
    await fs.writeFile(filePath, template);
    
    this.emit('migration:created', { id, path: filePath });
    return filePath;
  }

  // Diff generation for review
  public async generateDiff(
    config: MigrationConfig
  ): Promise<Map<string, string>> {
    const diffs = new Map<string, string>();
    const context = this.createMigrationContext({ ...config, dryRun: true });
    
    const migrations = this.findApplicableMigrations(
      config.sourceVersion,
      config.targetVersion
    );
    
    const sortedMigrations = this.sortMigrations(migrations);
    
    // Track file contents before and after
    const fileContents = new Map<string, { before: string; after: string }>();
    
    for (const migration of sortedMigrations) {
      await migration.up(context);
    }
    
    // Generate diffs for changed files
    for (const [file, contents] of fileContents.entries()) {
      const fileDiff = diff.createPatch(
        file,
        contents.before,
        contents.after,
        'Before migration',
        'After migration'
      );
      diffs.set(file, fileDiff);
    }
    
    return diffs;
  }
}

export default MigrationTools;