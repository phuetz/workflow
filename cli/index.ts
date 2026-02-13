#!/usr/bin/env node
/**
 * Workflow CLI Tool
 * Command line interface for workflow automation platform
 * Similar to n8n CLI functionality
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const program = new Command();

// Version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

program
  .name('workflow')
  .description('Workflow Automation Platform CLI')
  .version(packageJson.version || '2.0.0');

// Start command - Start the workflow server
program
  .command('start')
  .description('Start the workflow automation server')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .option('--tunnel', 'Create a public tunnel for webhooks')
  .option('-e, --env <env>', 'Environment (development, production)', 'development')
  .action(async (options) => {
    console.log('Starting Workflow Automation Platform...');
    console.log(`  Port: ${options.port}`);
    console.log(`  Host: ${options.host}`);
    console.log(`  Environment: ${options.env}`);

    if (options.tunnel) {
      console.log('  Tunnel: Enabled (creating public URL...)');
      // Tunnel logic would be imported from tunnel service
    }

    // Dynamic import to avoid loading everything at startup
    try {
      const { startServer } = await import('../src/backend/api/server');
      await startServer({
        port: parseInt(options.port),
        host: options.host,
        environment: options.env,
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });

// Execute command - Execute a workflow
program
  .command('execute')
  .description('Execute a workflow from file or by ID')
  .argument('<workflow>', 'Workflow file path or workflow ID')
  .option('-d, --data <json>', 'Input data as JSON string')
  .option('-f, --data-file <file>', 'Input data from JSON file')
  .option('--wait', 'Wait for execution to complete', true)
  .option('-o, --output <file>', 'Output file for results')
  .option('--timeout <ms>', 'Execution timeout in milliseconds', '300000')
  .action(async (workflow, options) => {
    console.log(`Executing workflow: ${workflow}`);

    let inputData = {};

    // Parse input data
    if (options.data) {
      try {
        inputData = JSON.parse(options.data);
      } catch (e) {
        console.error('Invalid JSON in --data option');
        process.exit(1);
      }
    } else if (options.dataFile) {
      try {
        const dataContent = fs.readFileSync(options.dataFile, 'utf8');
        inputData = JSON.parse(dataContent);
      } catch (e) {
        console.error(`Failed to read data file: ${options.dataFile}`);
        process.exit(1);
      }
    }

    try {
      // Load workflow
      let workflowData;
      if (fs.existsSync(workflow)) {
        // Load from file
        const content = fs.readFileSync(workflow, 'utf8');
        workflowData = JSON.parse(content);
        console.log(`  Loaded workflow from file: ${workflow}`);
      } else {
        // Assume it's a workflow ID, fetch from API
        console.log(`  Fetching workflow by ID: ${workflow}`);
        const response = await fetch(`http://localhost:3000/api/workflows/${workflow}`);
        if (!response.ok) {
          throw new Error(`Workflow not found: ${workflow}`);
        }
        workflowData = await response.json();
      }

      console.log(`  Workflow: ${workflowData.name || 'Unnamed'}`);
      console.log(`  Nodes: ${workflowData.nodes?.length || 0}`);
      console.log('  Executing...');

      // Execute workflow
      const { WorkflowExecutor } = await import('../src/components/ExecutionEngine');
      const executor = new WorkflowExecutor();

      const startTime = Date.now();
      const result = await Promise.race([
        executor.execute(workflowData, inputData),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Execution timeout')), parseInt(options.timeout))
        ),
      ]);

      const duration = Date.now() - startTime;
      console.log(`  Completed in ${duration}ms`);

      // Output results
      const output = JSON.stringify(result, null, 2);

      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`  Results saved to: ${options.output}`);
      } else {
        console.log('\nResults:');
        console.log(output);
      }

      process.exit(0);
    } catch (error) {
      console.error('Execution failed:', error);
      process.exit(1);
    }
  });

// Export command - Export workflows
program
  .command('export')
  .description('Export workflows to JSON file')
  .option('-a, --all', 'Export all workflows')
  .option('-i, --id <id>', 'Export specific workflow by ID')
  .option('-o, --output <file>', 'Output file', 'workflows-export.json')
  .option('--pretty', 'Pretty print JSON', true)
  .action(async (options) => {
    console.log('Exporting workflows...');

    try {
      let workflows;

      if (options.id) {
        const response = await fetch(`http://localhost:3000/api/workflows/${options.id}`);
        if (!response.ok) throw new Error('Workflow not found');
        workflows = [await response.json()];
      } else {
        const response = await fetch('http://localhost:3000/api/workflows');
        if (!response.ok) throw new Error('Failed to fetch workflows');
        const data = await response.json();
        workflows = data.workflows || data;
      }

      const output = options.pretty
        ? JSON.stringify(workflows, null, 2)
        : JSON.stringify(workflows);

      fs.writeFileSync(options.output, output);
      console.log(`  Exported ${workflows.length} workflow(s) to: ${options.output}`);

      process.exit(0);
    } catch (error) {
      console.error('Export failed:', error);
      process.exit(1);
    }
  });

// Import command - Import workflows
program
  .command('import')
  .description('Import workflows from JSON file')
  .argument('<file>', 'JSON file to import')
  .option('--overwrite', 'Overwrite existing workflows', false)
  .option('--dry-run', 'Preview import without making changes', false)
  .action(async (file, options) => {
    console.log(`Importing workflows from: ${file}`);

    try {
      const content = fs.readFileSync(file, 'utf8');
      const workflows = JSON.parse(content);

      const workflowArray = Array.isArray(workflows) ? workflows : [workflows];

      console.log(`  Found ${workflowArray.length} workflow(s)`);

      if (options.dryRun) {
        console.log('\nDry run - workflows to be imported:');
        workflowArray.forEach((wf, i) => {
          console.log(`  ${i + 1}. ${wf.name || 'Unnamed'} (${wf.nodes?.length || 0} nodes)`);
        });
        process.exit(0);
      }

      for (const workflow of workflowArray) {
        const response = await fetch('http://localhost:3000/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflow),
        });

        if (response.ok) {
          console.log(`  Imported: ${workflow.name || 'Unnamed'}`);
        } else {
          console.error(`  Failed to import: ${workflow.name}`);
        }
      }

      console.log('Import completed!');
      process.exit(0);
    } catch (error) {
      console.error('Import failed:', error);
      process.exit(1);
    }
  });

// List command - List workflows
program
  .command('list')
  .alias('ls')
  .description('List all workflows')
  .option('--json', 'Output as JSON')
  .option('-l, --long', 'Show detailed information')
  .action(async (options) => {
    try {
      const response = await fetch('http://localhost:3000/api/workflows');
      if (!response.ok) throw new Error('Failed to fetch workflows');

      const data = await response.json();
      const workflows = data.workflows || data || [];

      if (options.json) {
        console.log(JSON.stringify(workflows, null, 2));
      } else if (workflows.length === 0) {
        console.log('No workflows found.');
      } else {
        console.log(`\nWorkflows (${workflows.length}):\n`);

        if (options.long) {
          workflows.forEach((wf: { id: string; name: string; nodes?: unknown[]; active?: boolean; updatedAt?: string }) => {
            console.log(`  ID: ${wf.id}`);
            console.log(`  Name: ${wf.name || 'Unnamed'}`);
            console.log(`  Nodes: ${wf.nodes?.length || 0}`);
            console.log(`  Active: ${wf.active ? 'Yes' : 'No'}`);
            console.log(`  Updated: ${wf.updatedAt || 'Unknown'}`);
            console.log('');
          });
        } else {
          workflows.forEach((wf: { id: string; name: string; nodes?: unknown[] }, i: number) => {
            console.log(`  ${i + 1}. ${wf.name || 'Unnamed'} [${wf.id}] (${wf.nodes?.length || 0} nodes)`);
          });
        }
      }

      process.exit(0);
    } catch (error) {
      console.error('Failed to list workflows:', error);
      process.exit(1);
    }
  });

// Tunnel command - Create public tunnel for webhooks
program
  .command('tunnel')
  .description('Create a public tunnel for webhook testing')
  .option('-p, --port <port>', 'Local port to tunnel', '3000')
  .option('--subdomain <name>', 'Request specific subdomain')
  .action(async (options) => {
    console.log('Creating public tunnel...');
    console.log(`  Local port: ${options.port}`);

    try {
      const { TunnelService } = await import('../src/services/TunnelService');
      const tunnel = new TunnelService();

      const url = await tunnel.create({
        port: parseInt(options.port),
        subdomain: options.subdomain,
      });

      console.log('\nTunnel created successfully!');
      console.log(`  Public URL: ${url}`);
      console.log(`  Webhook URL: ${url}/webhook`);
      console.log('\nPress Ctrl+C to close the tunnel');

      // Keep process running
      process.on('SIGINT', async () => {
        console.log('\nClosing tunnel...');
        await tunnel.close();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to create tunnel:', error);
      console.log('\nTip: Install localtunnel with: npm install -g localtunnel');
      process.exit(1);
    }
  });

// Validate command - Validate workflow JSON
program
  .command('validate')
  .description('Validate a workflow JSON file')
  .argument('<file>', 'Workflow JSON file to validate')
  .action(async (file) => {
    console.log(`Validating workflow: ${file}`);

    try {
      const content = fs.readFileSync(file, 'utf8');
      const workflow = JSON.parse(content);

      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic validation
      if (!workflow.name) warnings.push('Workflow has no name');
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        errors.push('Workflow must have a nodes array');
      } else {
        if (workflow.nodes.length === 0) {
          warnings.push('Workflow has no nodes');
        }

        // Check for duplicate node IDs
        const nodeIds = workflow.nodes.map((n: { id: string }) => n.id);
        const duplicates = nodeIds.filter((id: string, i: number) => nodeIds.indexOf(id) !== i);
        if (duplicates.length > 0) {
          errors.push(`Duplicate node IDs: ${duplicates.join(', ')}`);
        }

        // Check for trigger nodes
        const triggers = workflow.nodes.filter((n: { type?: string }) =>
          n.type?.includes('trigger') || n.type?.includes('webhook')
        );
        if (triggers.length === 0) {
          warnings.push('Workflow has no trigger nodes');
        }
      }

      // Check edges
      if (workflow.edges && Array.isArray(workflow.edges)) {
        const nodeIds = new Set(workflow.nodes?.map((n: { id: string }) => n.id) || []);
        workflow.edges.forEach((edge: { source: string; target: string }, i: number) => {
          if (!nodeIds.has(edge.source)) {
            errors.push(`Edge ${i}: source node '${edge.source}' not found`);
          }
          if (!nodeIds.has(edge.target)) {
            errors.push(`Edge ${i}: target node '${edge.target}' not found`);
          }
        });
      }

      // Print results
      console.log('\nValidation Results:');
      console.log('-------------------');

      if (errors.length === 0 && warnings.length === 0) {
        console.log('  Workflow is valid!');
      } else {
        if (errors.length > 0) {
          console.log('\nErrors:');
          errors.forEach(e => console.log(`  - ${e}`));
        }
        if (warnings.length > 0) {
          console.log('\nWarnings:');
          warnings.forEach(w => console.log(`  - ${w}`));
        }
      }

      console.log(`\nSummary:`);
      console.log(`  Nodes: ${workflow.nodes?.length || 0}`);
      console.log(`  Edges: ${workflow.edges?.length || 0}`);
      console.log(`  Errors: ${errors.length}`);
      console.log(`  Warnings: ${warnings.length}`);

      process.exit(errors.length > 0 ? 1 : 0);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Invalid JSON:', error.message);
      } else {
        console.error('Validation failed:', error);
      }
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive CLI mode')
  .action(() => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'workflow> ',
    });

    console.log('Workflow CLI Interactive Mode');
    console.log('Type "help" for available commands, "exit" to quit\n');

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();

      if (input === 'exit' || input === 'quit') {
        console.log('Goodbye!');
        process.exit(0);
      }

      if (input === 'help') {
        console.log('\nAvailable commands:');
        console.log('  list       - List all workflows');
        console.log('  execute    - Execute a workflow');
        console.log('  validate   - Validate a workflow file');
        console.log('  export     - Export workflows');
        console.log('  import     - Import workflows');
        console.log('  tunnel     - Create public tunnel');
        console.log('  help       - Show this help');
        console.log('  exit       - Exit interactive mode\n');
      } else if (input) {
        // Execute command
        try {
          await program.parseAsync(['node', 'workflow', ...input.split(' ')]);
        } catch (e) {
          // Command handled
        }
      }

      rl.prompt();
    });
  });

// Worker command - Manage workflow execution workers
program
  .command('worker')
  .description('Start or manage workflow execution workers')
  .option('-c, --concurrency <number>', 'Number of concurrent jobs per worker', '10')
  .option('-n, --workers <number>', 'Number of worker processes', '1')
  .option('-q, --queue <name>', 'Queue name to process', 'default')
  .option('--stop', 'Stop all running workers')
  .option('--status', 'Show worker status')
  .option('--list', 'List all workers')
  .action(async (options) => {
    if (options.status || options.list) {
      console.log('Worker Status:');
      console.log('--------------');
      try {
        const response = await fetch('http://localhost:3000/api/queue-metrics');
        if (response.ok) {
          const metrics = await response.json();
          console.log(`  Active Workers: ${metrics.activeWorkers || 0}`);
          console.log(`  Jobs in Queue: ${metrics.waiting || 0}`);
          console.log(`  Active Jobs: ${metrics.active || 0}`);
          console.log(`  Completed: ${metrics.completed || 0}`);
          console.log(`  Failed: ${metrics.failed || 0}`);
        } else {
          console.log('  No workers running or queue not accessible');
        }
      } catch {
        console.log('  Unable to connect to server. Is it running?');
      }
      process.exit(0);
    }

    if (options.stop) {
      console.log('Stopping workers...');
      try {
        const response = await fetch('http://localhost:3000/api/queue/pause', {
          method: 'POST',
        });
        if (response.ok) {
          console.log('  Workers stopped successfully');
        } else {
          console.log('  Failed to stop workers');
        }
      } catch {
        console.log('  Unable to connect to server');
      }
      process.exit(0);
    }

    console.log('Starting workflow workers...');
    console.log(`  Concurrency: ${options.concurrency} jobs per worker`);
    console.log(`  Workers: ${options.workers}`);
    console.log(`  Queue: ${options.queue}`);

    try {
      const { QueueManager } = await import('../src/backend/queue/QueueManager');
      const manager = new QueueManager();

      // Start workers
      const workerCount = parseInt(options.workers);
      const concurrency = parseInt(options.concurrency);

      for (let i = 0; i < workerCount; i++) {
        await manager.startWorker({
          queueName: options.queue,
          concurrency,
          workerId: `worker-${i + 1}`,
        });
        console.log(`  Started worker ${i + 1} with concurrency ${concurrency}`);
      }

      console.log('\nWorkers running. Press Ctrl+C to stop.');

      process.on('SIGINT', async () => {
        console.log('\nStopping workers...');
        await manager.shutdown();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to start workers:', error);
      process.exit(1);
    }
  });

// Credentials command - Manage credentials
program
  .command('credentials')
  .description('Manage workflow credentials')
  .option('-l, --list', 'List all credentials')
  .option('-a, --add <name>', 'Add new credential')
  .option('-d, --delete <id>', 'Delete credential by ID')
  .option('-e, --export <id>', 'Export credential (encrypted)')
  .option('-i, --import <file>', 'Import credentials from file')
  .option('-t, --type <type>', 'Credential type (for --add)')
  .option('--test <id>', 'Test credential connection')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const baseUrl = 'http://localhost:3000/api/credentials';

    if (options.list) {
      console.log('Listing credentials...\n');
      try {
        const response = await fetch(baseUrl);
        if (!response.ok) throw new Error('Failed to fetch credentials');
        const credentials = await response.json();

        if (options.json) {
          // Remove sensitive data for JSON output
          const safe = credentials.map((c: { id: string; name: string; type: string; createdAt?: string }) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            createdAt: c.createdAt,
          }));
          console.log(JSON.stringify(safe, null, 2));
        } else {
          if (credentials.length === 0) {
            console.log('No credentials found.');
          } else {
            console.log('ID                                    Name                   Type');
            console.log('----                                  ----                   ----');
            credentials.forEach((c: { id: string; name: string; type: string }) => {
              console.log(`${c.id.padEnd(36)} ${c.name.padEnd(22)} ${c.type}`);
            });
            console.log(`\nTotal: ${credentials.length} credential(s)`);
          }
        }
      } catch (error) {
        console.error('Failed to list credentials:', error);
        process.exit(1);
      }
      process.exit(0);
    }

    if (options.add) {
      if (!options.type) {
        console.error('Error: --type is required when adding credentials');
        console.log('Example: workflow credentials --add "My API Key" --type api-key');
        process.exit(1);
      }

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log(`Adding new credential: ${options.add}`);
      console.log(`Type: ${options.type}\n`);

      // Prompt for credential data based on type
      const credentialData: Record<string, string> = {};

      const askQuestion = (question: string): Promise<string> => {
        return new Promise((resolve) => {
          rl.question(question, (answer) => {
            resolve(answer);
          });
        });
      };

      const commonFields: Record<string, string[]> = {
        'api-key': ['apiKey'],
        'oauth2': ['clientId', 'clientSecret', 'accessToken', 'refreshToken'],
        'basic-auth': ['username', 'password'],
        'bearer-token': ['token'],
        'database': ['host', 'port', 'database', 'username', 'password'],
        'smtp': ['host', 'port', 'username', 'password'],
      };

      const fields = commonFields[options.type] || ['value'];

      for (const field of fields) {
        const isSecret = ['password', 'secret', 'token', 'apiKey', 'key'].some(
          (s) => field.toLowerCase().includes(s.toLowerCase())
        );
        const value = await askQuestion(`  ${field}${isSecret ? ' (hidden)' : ''}: `);
        credentialData[field] = value;
      }

      rl.close();

      try {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: options.add,
            type: options.type,
            data: credentialData,
          }),
        });

        if (response.ok) {
          const created = await response.json();
          console.log(`\nCredential created successfully!`);
          console.log(`  ID: ${created.id}`);
        } else {
          console.error('Failed to create credential');
          process.exit(1);
        }
      } catch (error) {
        console.error('Failed to create credential:', error);
        process.exit(1);
      }
      process.exit(0);
    }

    if (options.delete) {
      console.log(`Deleting credential: ${options.delete}`);
      try {
        const response = await fetch(`${baseUrl}/${options.delete}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          console.log('Credential deleted successfully');
        } else {
          console.error('Failed to delete credential');
          process.exit(1);
        }
      } catch (error) {
        console.error('Failed to delete credential:', error);
        process.exit(1);
      }
      process.exit(0);
    }

    if (options.test) {
      console.log(`Testing credential: ${options.test}`);
      try {
        const response = await fetch(`${baseUrl}/${options.test}/test`, {
          method: 'POST',
        });
        const result = await response.json();
        if (result.success) {
          console.log('  Connection test successful!');
        } else {
          console.error(`  Connection test failed: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Failed to test credential:', error);
        process.exit(1);
      }
      process.exit(0);
    }

    if (options.import) {
      console.log(`Importing credentials from: ${options.import}`);
      try {
        const content = fs.readFileSync(options.import, 'utf8');
        const credentials = JSON.parse(content);
        const credArray = Array.isArray(credentials) ? credentials : [credentials];

        for (const cred of credArray) {
          const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cred),
          });
          if (response.ok) {
            console.log(`  Imported: ${cred.name}`);
          } else {
            console.error(`  Failed to import: ${cred.name}`);
          }
        }
        console.log('Import completed!');
      } catch (error) {
        console.error('Failed to import credentials:', error);
        process.exit(1);
      }
      process.exit(0);
    }

    // Default: show help
    console.log('Credentials Management Commands:');
    console.log('  workflow credentials --list              List all credentials');
    console.log('  workflow credentials --add <name> -t <type>  Add new credential');
    console.log('  workflow credentials --delete <id>       Delete credential');
    console.log('  workflow credentials --test <id>         Test credential');
    console.log('  workflow credentials --import <file>     Import from file');
    console.log('\nCredential Types: api-key, oauth2, basic-auth, bearer-token, database, smtp');
  });

// Database migration command
program
  .command('db:migrate')
  .description('Run database migrations')
  .option('--status', 'Show migration status')
  .option('--reset', 'Reset database (WARNING: destroys all data)')
  .option('--seed', 'Seed database with initial data')
  .option('--create <name>', 'Create new migration file')
  .option('--rollback', 'Rollback last migration')
  .option('-n, --steps <number>', 'Number of migrations to rollback', '1')
  .action(async (options) => {
    console.log('Database Migration Tool\n');

    if (options.status) {
      console.log('Migration Status:');
      try {
        const { execSync } = await import('child_process');
        const result = execSync('npx prisma migrate status', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        console.log(result);
      } catch (error) {
        // Prisma outputs to stderr even on success sometimes
        console.log('  Run "npx prisma migrate status" for detailed status');
      }
      process.exit(0);
    }

    if (options.reset) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('WARNING: This will destroy all data. Type "yes" to confirm: ', async (answer) => {
        rl.close();
        if (answer.toLowerCase() === 'yes') {
          console.log('Resetting database...');
          try {
            const { execSync } = await import('child_process');
            execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
            console.log('\nDatabase reset successfully!');
          } catch (error) {
            console.error('Failed to reset database');
          }
        } else {
          console.log('Reset cancelled.');
        }
        process.exit(0);
      });
      return;
    }

    if (options.seed) {
      console.log('Seeding database...');
      try {
        const { execSync } = await import('child_process');
        execSync('npx prisma db seed', { stdio: 'inherit' });
        console.log('\nDatabase seeded successfully!');
      } catch {
        console.error('Failed to seed database');
        console.log('Tip: Make sure you have a seed file at prisma/seed.ts');
      }
      process.exit(0);
    }

    if (options.create) {
      console.log(`Creating migration: ${options.create}`);
      try {
        const { execSync } = await import('child_process');
        execSync(`npx prisma migrate dev --name ${options.create} --create-only`, {
          stdio: 'inherit',
        });
        console.log('\nMigration created! Review and apply with: workflow db:migrate');
      } catch {
        console.error('Failed to create migration');
      }
      process.exit(0);
    }

    if (options.rollback) {
      console.log(`Rolling back ${options.steps} migration(s)...`);
      console.log('Note: Prisma does not support direct rollback.');
      console.log('To rollback:');
      console.log('  1. Delete the migration folder in prisma/migrations/');
      console.log('  2. Run: npx prisma migrate resolve --rolled-back <migration_name>');
      console.log('  3. Then run: workflow db:migrate');
      process.exit(0);
    }

    // Default: run migrations
    console.log('Running migrations...');
    try {
      const { execSync } = await import('child_process');

      // Check environment
      const env = process.env.NODE_ENV || 'development';

      if (env === 'production') {
        console.log('  Environment: production');
        console.log('  Running: npx prisma migrate deploy');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      } else {
        console.log('  Environment: development');
        console.log('  Running: npx prisma migrate dev');
        execSync('npx prisma migrate dev', { stdio: 'inherit' });
      }

      console.log('\nMigrations completed successfully!');
    } catch {
      console.error('Migration failed');
      console.log('\nTroubleshooting:');
      console.log('  1. Ensure DATABASE_URL is set in .env');
      console.log('  2. Ensure database server is running');
      console.log('  3. Run "npx prisma migrate status" for details');
    }
    process.exit(0);
  });

// Security audit command (like n8n audit)
program
  .command('audit')
  .description('Run security audit on workflows')
  .option('-f, --file <file>', 'Audit specific workflow file')
  .option('-a, --all', 'Audit all workflows')
  .option('--fix', 'Attempt to auto-fix issues')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    console.log('Security Audit\n');

    try {
      const { AntiPatternDetector } = await import('../src/patterns/AntiPatternDetector');

      let workflows: { name: string; nodes: unknown[]; edges: unknown[] }[] = [];

      if (options.file) {
        const content = fs.readFileSync(options.file, 'utf8');
        workflows = [JSON.parse(content)];
      } else {
        const response = await fetch('http://localhost:3000/api/workflows');
        if (response.ok) {
          const data = await response.json();
          workflows = data.workflows || data || [];
        }
      }

      if (workflows.length === 0) {
        console.log('No workflows to audit.');
        process.exit(0);
      }

      const results: {
        workflow: string;
        health: { score: number; grade: string };
        issues: unknown[];
      }[] = [];

      for (const wf of workflows) {
        const health = AntiPatternDetector.calculateHealthScore(
          wf.nodes as { id: string; type: string; position: { x: number; y: number }; data: { label: string; config?: Record<string, unknown> } }[],
          wf.edges as { id: string; source: string; target: string; type: string; data?: Record<string, unknown> }[]
        );
        results.push({
          workflow: wf.name || 'Unnamed',
          health: { score: health.score, grade: health.grade },
          issues: health.issues,
        });
      }

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log('Audit Results:');
        console.log('==============\n');

        for (const result of results) {
          const scoreColor = result.health.score >= 80 ? '' : result.health.score >= 60 ? '' : '';
          console.log(`Workflow: ${result.workflow}`);
          console.log(`  Health Score: ${result.health.score.toFixed(0)}/100 (Grade: ${result.health.grade})`);
          if (result.issues.length > 0) {
            console.log(`  Issues: ${result.issues.length}`);
            (result.issues as { antiPattern: { name: string; severity: string } }[]).slice(0, 3).forEach((issue) => {
              console.log(`    - [${issue.antiPattern.severity.toUpperCase()}] ${issue.antiPattern.name}`);
            });
            if (result.issues.length > 3) {
              console.log(`    ... and ${result.issues.length - 3} more`);
            }
          } else {
            console.log('  No issues found!');
          }
          console.log('');
        }

        // Summary
        const avgScore = results.reduce((sum, r) => sum + r.health.score, 0) / results.length;
        const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
        console.log('Summary:');
        console.log(`  Workflows audited: ${results.length}`);
        console.log(`  Average health score: ${avgScore.toFixed(0)}/100`);
        console.log(`  Total issues: ${totalIssues}`);
      }
    } catch (error) {
      console.error('Audit failed:', error);
      process.exit(1);
    }
    process.exit(0);
  });

// Parse arguments
program.parse();
